const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { initializeApp: fbInitializeApp, cert: fbCert } = require('firebase-admin/app');
const { getFirestore: fbGetFirestore } = require('firebase-admin/firestore');
const nodemailer = require('nodemailer');
const archiver = require('archiver');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3017;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
// Limite relevee (au lieu de 20mb) : l'envoi du RJC par email peut regrouper
// plusieurs documents en base64 (chacun +33% une fois encode) dans une seule requete.
app.use(express.json({ limit: '40mb' }));

// ── AUTHENTIFICATION simple (mot de passe partage via variable APP_PASSWORD) ──
// Tant que APP_PASSWORD n'est pas defini sur Render, l'API reste ouverte (pour
// ne pas se bloquer avant configuration). Des qu'il est defini, chaque appel
// /api/* doit fournir l'en-tete X-App-Password correspondant, sinon 401.
app.use('/api', function (req, res, next) {
  if (!process.env.APP_PASSWORD) return next();
  const fourni = req.headers['x-app-password'] || '';
  if (fourni === process.env.APP_PASSWORD) return next();
  return res.status(401).json({ error: 'Mot de passe requis ou invalide' });
});
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Proxy API Groq (compatible messages)
app.post('/api/claude', async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Cle API Groq non configuree' });
  }
  try {
    // Adapter le body Anthropic vers Groq.
    // Modele texte par defaut ; on autorise un modele VISION si le client le demande
    // (Sami : commentaire de photos de visite). Liste blanche = securite.
    const MODELES_OK = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'qwen/qwen3.6-27b'
    ];
    const modele = MODELES_OK.indexOf(req.body.model) !== -1 ? req.body.model : 'llama-3.3-70b-versatile';
    const body = {
      model: modele,
      max_tokens: req.body.max_tokens || 4096,
      messages: req.body.messages || [],
    };
    // Controle de la reflexion (Qwen 3.6 : 'none' = pas de <think>, reponse directe)
    if (req.body.reasoning_effort) body.reasoning_effort = req.body.reasoning_effort;
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

// Proxy annuaire officiel des entreprises (recherche-entreprises.api.gouv.fr).
// Sert a rechercher/remplir ET a VERIFIER un SIRET fourni par une entreprise
// (nom coherent ? entreprise active ou radiee ?) — utile avec la facturation
// electronique. Public, sans cle. On passe par le serveur pour eviter tout CORS.
app.get('/api/entreprise', (req, res) => {
  const q = String((req.query || {}).q || '').trim();
  if (!q) return res.status(400).json({ error: 'q manquant' });
  const options = {
    hostname: 'recherche-entreprises.api.gouv.fr',
    path: '/search?page=1&per_page=5&q=' + encodeURIComponent(q),
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  };
  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', (chunk) => { data += chunk; });
    apiRes.on('end', () => {
      res.status(apiRes.statusCode || 200).set('Content-Type', 'application/json').send(data);
    });
  });
  apiReq.on('error', (err) => { res.status(502).json({ error: err.message }); });
  apiReq.end();
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
  let cred = null;
  // Methode robuste (recommandee) : coller le JSON complet du compte de service
  // dans UNE seule variable FIREBASE_SERVICE_ACCOUNT. JSON.parse gere les \n
  // nativement -> plus jamais d'erreur "Failed to parse private key".
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    // Methode historique (3 variables separees), conservee en secours
    cred = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }
  if (cred) {
    fbInitializeApp({ credential: fbCert(cred) });
    db = fbGetFirestore();
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
// ── Envoi email : API HTTPS Brevo en priorite, SMTP Gmail en secours ──
// Render (plan gratuit) BLOQUE le SMTP sortant (ports 25/465/587) depuis fin
// septembre 2025 -> nodemailer/Gmail ne peut plus fonctionner ("Connection
// timeout"). On passe donc par l'API HTTPS de Brevo (port 443, non bloque).
// Le SMTP Gmail reste en secours automatique si BREVO_API_KEY est absente
// (utile si l'appli migre un jour sur un plan payant ou un autre hebergeur).
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
// Expediteur : doit etre VALIDE dans Brevo (Senders). Par defaut = GMAIL_USER.
const MAIL_FROM = process.env.BREVO_SENDER || process.env.GMAIL_USER || '';

let mailer = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  mailer = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 60000,
  });
}

const mailPret = !!(BREVO_API_KEY || mailer);
if (BREVO_API_KEY) console.log('Envoi email via API Brevo configure OK');
else if (mailer) console.log('Envoi email via SMTP Gmail configure (attention : bloque sur Render gratuit)');
else console.warn('Ni BREVO_API_KEY ni GMAIL_USER/GMAIL_APP_PASSWORD -> envoi email indisponible');

// Envoi unifie. to = email unique OU tableau d'emails.
// attachments = [{ filename, content (Buffer) }]
async function envoyerEmail({ to, subject, text, attachments }) {
  const dests = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!dests.length) throw new Error('Aucun destinataire');
  if (BREVO_API_KEY) {
    const body = {
      sender: { email: MAIL_FROM, name: 'CSPS17 — Alain SUZANNE' },
      to: dests.map((e) => ({ email: e })),
      subject: subject,
      textContent: text,
    };
    if (attachments && attachments.length) {
      body.attachment = attachments.map((a) => ({
        name: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : String(a.content),
      }));
    }
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      let msg = 'HTTP ' + r.status;
      try { const j = await r.json(); msg += ' — ' + (j.message || JSON.stringify(j)); } catch (e) {}
      throw new Error('Brevo : ' + msg);
    }
    return;
  }
  if (mailer) {
    await mailer.sendMail({ from: process.env.GMAIL_USER, to: dests.join(', '), subject, text, attachments });
    return;
  }
  throw new Error('Envoi email non configure (BREVO_API_KEY manquante)');
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
  // Cle de stockage / nom de fichier SUR : on retire les accents et on remplace
  // espaces + caracteres speciaux par "_". Supabase Storage refuse les cles
  // non-ASCII (accents) : sans ca, un nom comme "...Ploneour signee.pdf" fait
  // echouer le depot ET le telechargement (message rouge). Corrige le 06/07.
  const s = String(str || fallback || 'document')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')     // enleve les accents
    .replace(/[^A-Za-z0-9._-]+/g, '_')                    // espaces & speciaux -> _
    .replace(/_+/g, '_')                                  // pas de doublons
    .replace(/^[_.\-]+|[_.\-]+$/g, '')                    // rien d'inutile en bord
    .trim();
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

// Envoi d'un document unique vers la boite du CSPS lui-meme (auto-archivage :
// horodatage externe dans Gmail + transfert facile au destinataire depuis le tel).
app.post('/api/envoyer-doc', async (req, res) => {
  if (!mailPret) {
    return res.status(500).json({ error: "Envoi email non configure sur le serveur (variable BREVO_API_KEY manquante)" });
  }
  try {
    const { fichierPath, fichierData, fichierNom, numAffaire, chantierNom, objet, destinatairesSupp } = req.body || {};
    // Destinataires supplementaires optionnels (entreprise, MOE...) : envoi
    // SIMULTANE au CSPS (sauvegarde/trace) + aux tiers, en un seul email.
    const supp = String(destinatairesSupp || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
    let content = null;
    if (fichierPath && supabaseOk) {
      const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(fichierPath);
      if (error) throw error;
      content = Buffer.from(await data.arrayBuffer());
    } else if (fichierData && typeof fichierData === 'string' && fichierData.startsWith('data:')) {
      content = Buffer.from(fichierData.split(',')[1] || '', 'base64');
    }
    if (!content || !content.length) return res.status(400).json({ error: 'Fichier introuvable ou vide' });
    const sujet = ('[CSPS17] ' + (numAffaire || '') + ' ' + (chantierNom || '') + ' \u2014 ' + (fichierNom || 'document')).replace(/\s+/g, ' ').trim();
    const moi = process.env.GMAIL_USER || MAIL_FROM;
    const dests = [moi].concat(supp.filter((s) => s.toLowerCase() !== String(moi).toLowerCase()));
    const corps = supp.length
      ? 'Bonjour,\n\n'
        + 'Veuillez trouver ci-joint le document suivant, transmis par Alain SUZANNE, coordonnateur SPS (CSPS17).\n\n'
        + 'Affaire : ' + (numAffaire || '-') + ' \u2014 ' + (chantierNom || '-') + '\n'
        + 'Objet : ' + (objet || '-') + '\n\n'
        + 'Cordialement,\nAlain SUZANNE \u2014 Coordonnateur SPS\ncoordo17sps@gmail.com \u2014 07 81 08 30 54'
      : 'Document genere via CSPS17.\n\n'
        + 'Affaire : ' + (numAffaire || '-') + ' \u2014 ' + (chantierNom || '-') + '\n'
        + 'Objet : ' + (objet || '-') + '\n\n'
        + 'Pret a etre transfere au destinataire.';
    await envoyerEmail({
      to: dests,
      subject: sujet,
      text: corps,
      attachments: [{ filename: fichierNom || 'document.docx', content }],
    });
    res.json({ ok: true, destinataires: dests.length });
  } catch (err) {
    console.error('Erreur envoi doc:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/envoyer-rjc', async (req, res) => {
  if (!mailPret) {
    return res.status(500).json({ error: "Envoi email non configure sur le serveur (variable BREVO_API_KEY manquante)" });
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

      await envoyerEmail({
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
