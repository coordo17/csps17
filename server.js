const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const archiver = require('archiver');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3017;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
// Limite relevee (au lieu de 20mb) : l'envoi du RJC par email peut regrouper
// plusieurs documents en base64 (chacun +33% une fois encode) dans une seule requete.
app.use(express.json({ limit: '40mb' }));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Proxy API Groq (compatible messages)
app.post('/api/claude', async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Cle API Groq non configuree' });
  }
  try {
    // Adapter le body Anthropic vers Groq
    const body = {
      model: 'llama-3.3-70b-versatile',
      max_tokens: req.body.max_tokens || 4096,
      messages: req.body.messages || [],
    };
    if (req.body.system) {
      body.messages = [{ role: 'system', content: req.body.system }, ...body.messages];
    }
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY,
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', (chunk) => { data += chunk; });
      proxyRes.on('end', () => {
        try {
          const groqData = JSON.parse(data);
          // Convertir la reponse Groq au format Anthropic
          const anthropicFormat = {
            content: [{ type: 'text', text: groqData.choices?.[0]?.message?.content || '' }],
            model: groqData.model,
            usage: groqData.usage,
          };
          res.status(proxyRes.statusCode).json(anthropicFormat);
        } catch (e) {
          res.status(500).json({ error: 'Erreur parsing reponse Groq' });
        }
      });
    });
    proxyReq.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
    proxyReq.write(payload);
    proxyReq.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Sauvegarde des affaires — Firestore (persistance reelle, survit aux
// redemarrages/mises en veille de Render gratuit, contrairement a un fichier
// local sur disque qui est efface a chaque redeploy/spin-down sur le tier gratuit).
// Chaque affaire = un document dans la collection "affaires", identifie par
// son propre champ `id` cote client (ex: "aff-1719840000000"). On stocke une
// affaire par document plutot qu'un seul gros document pour toutes, pour ne
// pas risquer la limite de 1 Mo par document Firestore si une affaire contient
// beaucoup de photos en base64.
// ============================================================================
let db = null;
let firebaseOk = false;
try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    db = admin.firestore();
    firebaseOk = true;
    console.log('Firestore initialise OK');
  } else {
    console.warn('Variables FIREBASE_* absentes -> fallback fichier local (non persistant sur Render gratuit)');
  }
} catch (e) {
  console.error('Erreur init Firestore:', e.message, '-> fallback fichier local');
}

// ============================================================================
// Supabase Storage — stockage des fichiers reels attaches au RJC (scans/PDF/
// photos rapportees du terrain, documents auto-generes). On ne stocke QUE le
// chemin ("path") dans Firestore, jamais le contenu du fichier : ca evite la
// limite de 1 Mo/document Firestore, qui aurait fini par etre atteinte au fil
// des 5 ans de conservation legale du registre (RJC).
// La cle utilisee cote serveur est la cle secrete (sb_secret_...), jamais
// exposee au client — meme logique de confiance que la cle Firebase Admin :
// uniquement en variable d'environnement Render, jamais commitee.
// ============================================================================
const SUPABASE_BUCKET = 'rjc-documents';
let supabase = null;
let supabaseOk = false;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  try {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    supabaseOk = true;
    console.log('Supabase Storage initialise OK');
    // Cree le bucket au demarrage s'il n'existe pas deja (prive : jamais accessible
    // directement par une URL publique, uniquement via /api/rjc-file cote serveur).
    (async () => {
      try {
        const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
        if (listErr) throw listErr;
        const existe = (buckets || []).some((b) => b.name === SUPABASE_BUCKET);
        if (!existe) {
          const { error: createErr } = await supabase.storage.createBucket(SUPABASE_BUCKET, { public: false });
          if (createErr) throw createErr;
          console.log(`Bucket Supabase "${SUPABASE_BUCKET}" cree`);
        } else {
          console.log(`Bucket Supabase "${SUPABASE_BUCKET}" deja present`);
        }
      } catch (e) {
        console.error('Erreur verif/creation bucket Supabase:', e.message);
      }
    })();
  } catch (e) {
    console.error('Erreur init Supabase:', e.message, '-> upload RJC indisponible');
  }
} else {
  console.warn('Variables SUPABASE_URL / SUPABASE_SERVICE_KEY absentes -> upload de fichiers RJC indisponible');
}

// Fallback fichier local si Firebase n'est pas configure (ex: en dev local
// sans les variables d'environnement) — memes limites qu'avant (non persistant
// sur Render gratuit), mais evite de casser l'app si les variables manquent.
const DATA_FILE = path.join(__dirname, 'affaires.json');
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

app.get('/api/affaires', async (req, res) => {
  if (firebaseOk) {
    try {
      const snapshot = await db.collection('affaires').get();
      const affaires = snapshot.docs.map(function (doc) { return doc.data(); });
      return res.json(affaires);
    } catch (e) {
      console.error('Erreur lecture Firestore:', e.message);
      return res.json([]);
    }
  }
  try {
    res.json(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/affaires', async (req, res) => {
  const affaires = Array.isArray(req.body) ? req.body : [];
  if (firebaseOk) {
    try {
      const collection = db.collection('affaires');
      const existingSnapshot = await collection.get();
      const existingIds = existingSnapshot.docs.map(function (d) { return d.id; });
      const newIds = affaires.map(function (a) { return a.id; }).filter(Boolean);
      const newIdsSet = new Set(newIds);
      const batch = db.batch();
      affaires.forEach(function (a) {
        if (!a || !a.id) return;
        batch.set(collection.doc(String(a.id)), a);
      });
      existingIds.forEach(function (id) {
        if (!newIdsSet.has(id)) batch.delete(collection.doc(id));
      });
      await batch.commit();
      return res.json({ ok: true });
    } catch (err) {
      console.error('Erreur ecriture Firestore:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(affaires, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Upload de fichiers RJC (scans/photos rapportes du terrain, PC, ou documents
// auto-generes) vers Supabase Storage. Le client envoie le fichier en base64
// (dataURL) — pas de nouvelle dependance multipart cote serveur, on reutilise
// la limite deja en place (40mb) sur express.json. Seul le "path" retourne est
// ensuite stocke dans l'affaire (Firestore), jamais le contenu du fichier.
// ============================================================================
app.post('/api/rjc-upload', async (req, res) => {
  if (!supabaseOk) {
    return res.status(500).json({ error: "Stockage Supabase non configure sur le serveur (variables SUPABASE_URL / SUPABASE_SERVICE_KEY manquantes)" });
  }
  try {
    const { affaireId, filename, fileData, contentType } = req.body || {};
    if (!affaireId) return res.status(400).json({ error: 'affaireId manquant' });
    if (!fileData) return res.status(400).json({ error: 'fileData manquant' });

    const base64 = String(fileData).includes(',') ? String(fileData).split(',')[1] : fileData;
    const buffer = Buffer.from(base64, 'base64');
    const storagePath = `${affaireId}/${Date.now()}_${nomFichierSur(filename, 'document')}`;

    const { error: uploadErr } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: contentType || 'application/octet-stream',
        upsert: false,
      });
    if (uploadErr) throw uploadErr;

    res.json({ ok: true, path: storagePath });
  } catch (err) {
    console.error('Erreur upload RJC:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Lecture d'un fichier RJC : le serveur telecharge depuis Supabase Storage
// (bucket prive, cle secrete jamais exposee) et streame directement le
// contenu au client. Cote client, un simple lien vers cette URL suffit.
app.get('/api/rjc-file', async (req, res) => {
  if (!supabaseOk) {
    return res.status(500).json({ error: 'Stockage Supabase non configure sur le serveur' });
  }
  try {
    const storagePath = req.query.path;
    if (!storagePath) return res.status(400).json({ error: 'path manquant' });

    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(storagePath);
    if (error) throw error;

    const buffer = Buffer.from(await data.arrayBuffer());
    const nom = storagePath.slice(storagePath.lastIndexOf('/') + 1);
    res.set('Content-Type', data.type || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${nom.replace(/"/g, '')}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Erreur lecture fichier RJC:', err.message);
    res.status(404).json({ error: "Fichier introuvable" });
  }
});

// Suppression d'un fichier RJC (cas d'un doublon ou d'une erreur d'attachement).
// Ne supprime QUE l'objet dans Supabase Storage — retirer/supprimer la ligne
// cote registre reste une decision de l'utilisateur (le RJC ne doit normalement
// pas etre reecrit a posteriori une fois transmis ; ceci sert a corriger une
// erreur de saisie du jour meme).
app.post('/api/rjc-delete-file', async (req, res) => {
  if (!supabaseOk) {
    return res.status(500).json({ error: 'Stockage Supabase non configure sur le serveur' });
  }
  try {
    const storagePath = (req.body || {}).path;
    if (!storagePath) return res.status(400).json({ error: 'path manquant' });
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove([storagePath]);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('Erreur suppression fichier RJC:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Envoi du RJC par email (ex: sur demande de l'Inspection du Travail, en plein
// chantier). Utilise le Gmail d'Alain via un mot de passe d'application (gratuit,
// pas de service tiers). Chaque entree du RJC deja munie d'un fichier (attache
// automatiquement des la generation, ou depose ensuite sur PC) est regroupee
// dans UN ZIP (plus propre qu'une pile de pieces jointes separees, et un peu
// plus leger) ; les entrees sans fichier sont listees en texte dans le corps
// du mail pour que rien ne manque a la chronologie.
//
// Un registre-journal peut devenir gros au fil des annees (obligation de
// conservation 5 ans). Gmail refuse purement et simplement un envoi au-dela
// d'environ 25 Mo (piece jointe encodee comprise) — sans zip, gros risque
// d'echec silencieux. Donc : on decoupe automatiquement en plusieurs emails
// ("Partie 1/2", "Partie 2/2"...) si necessaire, chaque zip restant sous une
// limite prudente, pour garantir que l'envoi aboutit toujours.
// ============================================================================
let mailer = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  console.log('Envoi email (Gmail) configure OK');
} else {
  console.warn('Variables GMAIL_USER / GMAIL_APP_PASSWORD absentes -> envoi RJC par email indisponible');
}

// Taille max (donnees brutes avant zip) par email — marge prudente sous la
// limite Gmail de ~25 Mo (encodage MIME + corps + en-tetes + zip qui ne
// compresse presque plus des .docx deja compresses).
const MAX_CHUNK_BYTES = 12 * 1024 * 1024;

function dateFR(iso) {
  if (!iso) return '';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function nomFichierSur(str, fallback) {
  const s = (str || fallback || 'document').replace(/[\\/:*?"<>|]/g, '-').trim();
  return s || fallback || 'document';
}

function creerZipBuffer(fichiers) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    fichiers.forEach((f) => archive.append(f.content, { name: f.filename }));
    archive.finalize();
  });
}

app.post('/api/envoyer-rjc', async (req, res) => {
  if (!mailer) {
    return res.status(500).json({ error: "Envoi email non configure sur le serveur (variables GMAIL_USER / GMAIL_APP_PASSWORD manquantes)" });
  }
  try {
    const { destinataire, numAffaire, chantierNom, entries } = req.body || {};
    if (!destinataire) return res.status(400).json({ error: 'Destinataire manquant' });

    const sorted = (Array.isArray(entries) ? entries : []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // 1. Construire la liste texte complete (pour le corps de chaque mail) et
    //    la liste des fichiers reels a zipper (pour les pieces jointes).
    const lignes = [];
    const fichiers = [];
    for (let i = 0; i < sorted.length; i++) {
      const e = sorted[i];
      const titre = e.titre || `${e.nature || ''}${e.intervenants ? ' — ' + e.intervenants : ''}`;
      let ligne = `${i + 1}. ${dateFR(e.date)} — ${titre}`;
      if (e.objet && e.objet !== titre) ligne += `\n   ${e.objet}`;

      // Contenu reel du fichier : soit deja dans Supabase Storage (fichierPath,
      // nouveau format leger), soit encore en base64 inline (fichierData,
      // anciennes entrees creees avant la migration Supabase).
      let content = null;
      if (e.fichierPath && supabaseOk) {
        try {
          const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(e.fichierPath);
          if (error) throw error;
          content = Buffer.from(await data.arrayBuffer());
        } catch (dlErr) {
          console.error('Erreur telechargement fichier RJC (' + e.fichierPath + '):', dlErr.message);
        }
      } else if (e.fichierData) {
        const base64 = String(e.fichierData).includes(',') ? String(e.fichierData).split(',')[1] : e.fichierData;
        content = Buffer.from(base64, 'base64');
      }

      if (content) {
        ligne += '  [dans le zip]';
        const ext = (e.fichierNom && e.fichierNom.includes('.')) ? e.fichierNom.slice(e.fichierNom.lastIndexOf('.')) : '.docx';
        fichiers.push({
          filename: `${String(i + 1).padStart(2, '0')}_${dateFR(e.date).replace(/\//g, '-')}_${nomFichierSur(titre)}${ext}`,
          content,
          size: content.length,
        });
      } else {
        ligne += '  [sans fichier joint]';
      }
      lignes.push(ligne);
    }

    // 2. Regrouper les fichiers en paquets (chunks) restant sous MAX_CHUNK_BYTES,
    //    dans l'ordre chronologique — un paquet peut deborder seul si un fichier
    //    unique est deja plus gros que la limite (rare).
    const chunks = [];
    let courant = [];
    let tailleCourante = 0;
    fichiers.forEach((f) => {
      if (courant.length && tailleCourante + f.size > MAX_CHUNK_BYTES) {
        chunks.push(courant);
        courant = [];
        tailleCourante = 0;
      }
      courant.push(f);
      tailleCourante += f.size;
    });
    if (courant.length) chunks.push(courant);
    if (!chunks.length) chunks.push([]); // aucun fichier joint -> un seul mail texte seul

    const totalFichiers = fichiers.length;
    const nbParties = chunks.length;

    // 3. Envoyer un email par paquet (un seul si tout tient dans MAX_CHUNK_BYTES).
    for (let p = 0; p < nbParties; p++) {
      const suffixeSujet = nbParties > 1 ? ` — Partie ${p + 1}/${nbParties}` : '';
      const sujet = `Registre Journal de Coordination — ${numAffaire || ''} — ${chantierNom || ''}${suffixeSujet}`.trim();

      const zipBuffer = chunks[p].length ? await creerZipBuffer(chunks[p]) : null;

      const introPartie = nbParties > 1
        ? `Ce registre est volumineux et a ete decoupe en ${nbParties} emails pour respecter les limites de taille de Gmail. Ceci est la partie ${p + 1}/${nbParties} (${chunks[p].length} document${chunks[p].length > 1 ? 's' : ''} dans le zip joint).\n\n`
        : '';

      const corps = `Bonjour,\n\n`
        + introPartie
        + `Registre journal de coordination (RJC) de l'operation ${chantierNom || ''} (${numAffaire || ''}), `
        + `transmis par Alain SUZANNE, coordonnateur SPS (CSPS17).\n\n`
        + `Chronologie complete (${lignes.length} entree${lignes.length > 1 ? 's' : ''}, ${totalFichiers} document${totalFichiers > 1 ? 's' : ''} au total) :\n\n`
        + `${lignes.join('\n\n')}\n\n`
        + `Cordialement,\nAlain SUZANNE — CSPS17`;

      const attachments = zipBuffer
        ? [{ filename: `RJC_${numAffaire || 'dossier'}${nbParties > 1 ? '_partie' + (p + 1) : ''}.zip`, content: zipBuffer }]
        : [];

      await mailer.sendMail({
        from: process.env.GMAIL_USER,
        to: destinataire,
        subject: sujet,
        text: corps,
        attachments,
      });
    }

    res.json({ ok: true, nbFichiers: totalFichiers, nbLignes: lignes.length, nbEmails: nbParties });
  } catch (err) {
    console.error('Erreur envoi RJC:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Fallback
app.get('*', (req, res) => {
  const fromPublic = path.join(__dirname, 'public', 'index.html');
  const fromRoot = path.join(__dirname, 'index.html');
  if (fs.existsSync(fromPublic)) {
    res.sendFile(fromPublic);
  } else if (fs.existsSync(fromRoot)) {
    res.sendFile(fromRoot);
  } else {
    res.status(404).send('index.html introuvable');
  }
});

app.listen(PORT, () => {
  console.log('CSPS17 lance sur port ' + PORT);
});
