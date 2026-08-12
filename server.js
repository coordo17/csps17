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
// Filet de secours quand TOUS les modeles Groq sont satures (429) : Cerebras,
// meme principe et meme modele que celui deja utilise et eprouve chez Leo.
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY || '';
// Filet de secours ultime si Cerebras est aussi indisponible. Contrairement a
// Leo (code cote navigateur, bloque par CORS), Sami est deja un serveur : il
// appelle SambaNova directement, pas besoin de relais.
const SAMBANOVA_API_KEY = process.env.SAMBANOVA_API_KEY || '';
// Deux derniers filets de secours, memes fournisseurs et modeles que Leo.
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
// Limite relevee (au lieu de 20mb) : l'envoi du RJC par email peut regrouper
// plusieurs documents en base64 (chacun +33% une fois encode) dans une seule requete.
app.use(express.json({ limit: '40mb' }));

// ── CORS : autorise Leo (leo-sync.onrender.com) a appeler l'API de Sami depuis
// son propre domaine. Sans ca, le navigateur bloque l'appel cross-origin.
// Liste blanche stricte (pas de '*') pour ne pas ouvrir l'API a n'importe qui.
// L'OPTIONS de prevol (preflight) est court-circuite avant la verification du
// mot de passe, car il n'a jamais l'en-tete X-App-Password.
var ORIGINES_AUTORISEES = ['https://leo-sync.onrender.com', 'https://sami-perso.onrender.com'];
app.use('/api', function (req, res, next) {
  var origin = req.headers.origin;
  if (ORIGINES_AUTORISEES.indexOf(origin) !== -1) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-App-Password');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

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
// ── Empeche tout cache intermediaire (proxy operateur mobile, cache Android, etc.)
// de garder une ancienne version de la page apres un deploiement : chaque visite
// doit revalider depuis le serveur au lieu de servir une copie perimee.
app.use(function (req, res, next) {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  next();
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
    const modeleDemande = MODELES_OK.indexOf(req.body.model) !== -1 ? req.body.model : 'llama-3.3-70b-versatile';
    // Repli automatique si le modele demande est sature (429) : sans ca, une
    // conversation (ex. Leo <-> Sami) s'arretait net a la moindre limite de
    // quota atteinte sur ce modele, alors qu'un autre modele repond souvent.
    const REPLI = {
      'llama-3.3-70b-versatile': 'llama-3.1-8b-instant',
      'qwen/qwen3.6-27b': 'llama-3.3-70b-versatile',
    };
    // Règle de style CSPS17 injectée sur TOUT texte rédigé (analyses, PGC, CR,
    // visites, harmonisation...), présent et futur. Elle soigne le fond ; le
    // correcteur de Word (langue fr-FR active) rattrape les coquilles résiduelles.
    const STYLE_CSPS = "Directive de style CSPS17, a appliquer a tout texte que tu rediges, y compris les champs texte d'un JSON (n'altere jamais la STRUCTURE d'un JSON demande, seulement la qualite du texte a l'interieur) : "
      + "1) Francais correct, sans faute d'accord ni coquille (jamais \"d'personnels\" : ecris \"de personnels\"). "
      + "2) Bannis les formules creuses et interchangeables (\"respecter les consignes de securite\", \"mettre en place des mesures de securite\", \"respecter les regles de circulation\", \"assurer la separation des phases\") : chaque affirmation doit nommer une zone, une phase, un corps d'etat, une date ou une mesure precise ; a defaut, ne l'ecris pas. "
      + "3) Ton sobre et professionnel de coordonnateur SPS : pas de majuscules criardes, pas de points d'exclamation superflus. "
      + "4) Ne mentionne jamais qu'un texte est genere, redige ou assiste par une IA.";
    let sysContent = req.body.system ? (STYLE_CSPS + '\n\n' + req.body.system) : STYLE_CSPS;
    // Sami relit ses propres souvenirs de ses conversations avec Leo (sa
    // propre memoire, ecrite par lui, pas un transcript envoye par Leo) —
    // que ce soit Leo qui l'appelle, ou Alain qui lui demande directement
    // qui est Leo : dans les deux cas, c'est sa memoire, elle doit lui servir.
    if (firebaseOk) {
      try {
        const doc = await db.collection('sami_journal').doc('leo').get();
        const entrees = doc.exists ? (doc.data().entrees || []) : [];
        if (entrees.length) {
          const recentes = entrees.slice(-5);
          sysContent += '\n\n[TA MEMOIRE DE LEO, TON COLLEGUE — une autre IA, deployee separement sur un autre outil d\'Alain]\n'
            + "Sers-t'en vraiment : si Leo te parle ou qu'Alain te demande qui est Leo, appuie-toi sur ces souvenirs au lieu de repondre a plat ou de dire que tu ne le connais pas. Ce sont de vrais echanges passes entre vous, pas une supposition.\n"
            + recentes.map((e) => '(' + (e.dateStr || e.date || '') + ') ' + e.resume).join('\n\n');
        }
      } catch (e) { /* pas de memoire disponible, on continue sans */ }
    }

    // Dernier recours quand TOUTE la chaine Groq est saturee (429) : Cerebras.
    // Plusieurs modeles essayes dans l'ordre — gpt-oss-120b (Production) demande
    // un moyen de paiement enregistre sur le compte Cerebras (renvoie 402 sans
    // ca) ; gemma-4-31b et zai-glm-4.7 sont en Apercu, gratuits sans carte.
    // On les tente d'abord, gpt-oss-120b reste en dernier au cas ou la
    // facturation serait activee un jour.
    const CEREBRAS_MODELES = ['gemma-4-31b', 'zai-glm-4.7', 'gpt-oss-120b'];
    function appelerCerebras(indice) {
      indice = indice || 0;
      if (!CEREBRAS_API_KEY) return appelerSambaNova();
      if (indice >= CEREBRAS_MODELES.length) return appelerSambaNova();
      const modele = CEREBRAS_MODELES[indice];
      const body = {
        model: modele,
        max_tokens: req.body.max_tokens || 4096,
        messages: [{ role: 'system', content: sysContent }, ...(req.body.messages || [])],
      };
      const payload = JSON.stringify(body);
      const options = {
        hostname: 'api.cerebras.ai',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + CEREBRAS_API_KEY,
          'Content-Length': Buffer.byteLength(payload),
        },
      };
      const proxyReq = https.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          if (proxyRes.statusCode !== 200) {
            return appelerCerebras(indice + 1);
          }
          try {
            const cerebrasData = JSON.parse(data);
            const anthropicFormat = {
              content: [{ type: 'text', text: cerebrasData.choices?.[0]?.message?.content || '' }],
              model: 'cerebras/' + (cerebrasData.model || modele),
              usage: cerebrasData.usage,
            };
            res.status(proxyRes.statusCode).json(anthropicFormat);
          } catch (e) {
            res.status(500).json({ error: 'Erreur parsing reponse Cerebras' });
          }
        });
      });
      proxyReq.on('error', (err) => { res.status(500).json({ error: err.message }); });
      proxyReq.write(payload);
      proxyReq.end();
    }

    // Filet de secours ultime : SambaNova, appele directement (serveur a
    // serveur, pas de CORS a contourner ici).
    function appelerSambaNova() {
      if (!SAMBANOVA_API_KEY) return appelerGoogleAI();
      const body = {
        model: 'Meta-Llama-3.3-70B-Instruct',
        max_tokens: req.body.max_tokens || 4096,
        messages: [{ role: 'system', content: sysContent }, ...(req.body.messages || [])],
      };
      const payload = JSON.stringify(body);
      const options = {
        hostname: 'api.sambanova.ai',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + SAMBANOVA_API_KEY,
          'Content-Length': Buffer.byteLength(payload),
        },
      };
      const proxyReq2 = https.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          if (proxyRes.statusCode !== 200) return appelerGoogleAI();
          try {
            const sambaData = JSON.parse(data);
            const anthropicFormat = {
              content: [{ type: 'text', text: sambaData.choices?.[0]?.message?.content || '' }],
              model: 'sambanova/' + (sambaData.model || 'Meta-Llama-3.3-70B-Instruct'),
              usage: sambaData.usage,
            };
            res.status(proxyRes.statusCode).json(anthropicFormat);
          } catch (e) {
            res.status(500).json({ error: 'Erreur parsing reponse SambaNova' });
          }
        });
      });
      proxyReq2.on('error', (err) => { res.status(500).json({ error: err.message }); });
      proxyReq2.write(payload);
      proxyReq2.end();
    }

    function appelerGoogleAI() {
      if (!GOOGLE_AI_API_KEY) return appelerOpenRouter();
      const body = {
        model: 'gemini-flash-latest',
        max_tokens: req.body.max_tokens || 4096,
        messages: [{ role: 'system', content: sysContent }, ...(req.body.messages || [])],
      };
      const payload = JSON.stringify(body);
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: '/v1beta/openai/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + GOOGLE_AI_API_KEY,
          'Content-Length': Buffer.byteLength(payload),
        },
      };
      const proxyReq3 = https.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          if (proxyRes.statusCode !== 200) return appelerOpenRouter();
          try {
            const gData = JSON.parse(data);
            const anthropicFormat = {
              content: [{ type: 'text', text: gData.choices?.[0]?.message?.content || '' }],
              model: 'google/' + (gData.model || 'gemini-flash-latest'),
              usage: gData.usage,
            };
            res.status(proxyRes.statusCode).json(anthropicFormat);
          } catch (e) {
            res.status(500).json({ error: 'Erreur parsing reponse Google AI' });
          }
        });
      });
      proxyReq3.on('error', (err) => { res.status(500).json({ error: err.message }); });
      proxyReq3.write(payload);
      proxyReq3.end();
    }

    function appelerOpenRouter() {
      if (!OPENROUTER_API_KEY) return res.status(429).json({ error: 'Tous les fournisseurs (Groq, Cerebras, SambaNova, Google AI, OpenRouter) sont indisponibles' });
      const body = {
        model: 'openai/gpt-oss-20b:free',
        max_tokens: req.body.max_tokens || 4096,
        messages: [{ role: 'system', content: sysContent }, ...(req.body.messages || [])],
      };
      const payload = JSON.stringify(body);
      const options = {
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
          'Content-Length': Buffer.byteLength(payload),
        },
      };
      const proxyReq4 = https.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          try {
            const oData = JSON.parse(data);
            const anthropicFormat = {
              content: [{ type: 'text', text: oData.choices?.[0]?.message?.content || '' }],
              model: 'openrouter/' + (oData.model || 'gpt-oss-20b'),
              usage: oData.usage,
            };
            res.status(proxyRes.statusCode).json(anthropicFormat);
          } catch (e) {
            res.status(500).json({ error: 'Erreur parsing reponse OpenRouter' });
          }
        });
      });
      proxyReq4.on('error', (err) => { res.status(500).json({ error: err.message }); });
      proxyReq4.write(payload);
      proxyReq4.end();
    }

    function appelerGroq(modele, dejaReplie) {
      const body = {
        model: modele,
        max_tokens: req.body.max_tokens || 4096,
        messages: [{ role: 'system', content: sysContent }, ...(req.body.messages || [])],
      };
      // Controle de la reflexion (Qwen 3.6 : 'none' = pas de <think>, reponse directe)
      if (req.body.reasoning_effort) body.reasoning_effort = req.body.reasoning_effort;
      // 'hidden' : le modele raisonne mais ne renvoie pas son raisonnement (reponse propre)
      if (req.body.reasoning_format) body.reasoning_format = req.body.reasoning_format;
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
          if (proxyRes.statusCode === 429) {
            if (!dejaReplie && REPLI[modele]) return appelerGroq(REPLI[modele], true);
            // Chaine Groq epuisee : dernier recours Cerebras plutot que d'echouer net.
            return appelerCerebras();
          }
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
    }

    appelerGroq(modeleDemande, false);
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

// Sami envoie un email directement a Alain, depuis une simple demande en
// conversation (pas un document genere) — declenche par l'action routeur
// "envoyer_mail_alain" cote client, jamais par du texte libre du modele.
app.post('/api/sami-envoyer-mail-alain', async (req, res) => {
  if (!mailPret) {
    return res.status(500).json({ error: 'Envoi email non configure sur le serveur (variable BREVO_API_KEY manquante)' });
  }
  try {
    const sujet = String((req.body && req.body.sujet) || 'Message de Sami').slice(0, 200);
    const corps = String((req.body && req.body.corps) || '').trim();
    if (!corps) return res.status(400).json({ error: 'corps manquant' });
    const dest = 'coordinateursps17@gmail.com';
    // Contenu long (ex: dump complet d'une memoire) -> piece jointe .txt plutot
    // qu'un pave de texte illisible dans le corps du mail. Un seul email suffit
    // toujours a cette echelle (bien en dessous de la limite Gmail ~25 Mo) :
    // pas besoin du decoupage multi-emails utilise pour le RJC (fichiers reels).
    const LONG = 2000;
    if (corps.length > LONG) {
      await envoyerEmail({
        to: dest,
        subject: '[Sami] ' + sujet,
        text: 'Contenu en piece jointe (trop long pour le corps du mail).',
        attachments: [{ filename: 'sami_' + Date.now() + '.txt', content: Buffer.from(corps, 'utf8') }],
      });
    } else {
      await envoyerEmail({ to: dest, subject: '[Sami] ' + sujet, text: corps });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

/* =====================================================================
   VEILLE QUOTIDIENNE — bulletin de controle des dossiers par mail
   ---------------------------------------------------------------------
   Route volontairement hors /api : elle est appelee par un declencheur
   externe (GitHub Actions) qui n'a pas le mot de passe de l'application.
   Elle ne renvoie AUCUNE donnee de dossier et n'ecrit rien : au pire,
   elle envoie a Alain un bulletin qu'il recevrait de toute facon.
   Un verrou de 6 h empeche tout envoi en rafale.
     /cron/veille            -> calcule et envoie le bulletin
     /cron/veille?apercu=1   -> affiche le bulletin sans l'envoyer
   ===================================================================== */
/* ---- Memoire longue de Sami : historique de conversation par dossier ---- */
app.get('/api/sami-memoire', async (req, res) => {
  const cle = String(req.query.dossier || 'general').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  if (!firebaseOk) return res.json({ messages: [] });
  try {
    const doc = await db.collection('sami_memoire').doc(cle).get();
    return res.json(doc.exists ? (doc.data() || { messages: [] }) : { messages: [] });
  } catch (e) { return res.json({ messages: [] }); }
});
app.post('/api/sami-memoire', async (req, res) => {
  const cle = String((req.body && req.body.dossier) || 'general').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  const messages = Array.isArray(req.body && req.body.messages) ? req.body.messages.slice(-40) : [];
  if (!firebaseOk) return res.json({ ok: false, raison: 'firestore indisponible' });
  try {
    await db.collection('sami_memoire').doc(cle).set({ messages: messages, maj: new Date().toISOString() });
    return res.json({ ok: true, n: messages.length });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

/* ---- Journal propre de Sami sur ses conversations avec Leo ----------------
   Distinct de "sami_memoire" (memoire de travail par dossier de chantier) :
   ici Sami recoit la transcription brute d'une conversation avec Leo terminee,
   redige SON PROPRE compte-rendu (sa personnalite, pas celle de Leo) et le
   range dans sa propre memoire. Relu automatiquement dans /api/claude quand
   Leo rappelle (voir plus haut), pour que ca influence vraiment ses reponses. */
app.post('/api/sami-conclusion-leo', async (req, res) => {
  if (!firebaseOk) return res.json({ ok: false, raison: 'firestore indisponible' });
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'Cle API Groq non configuree' });
  try {
    const sujet = String((req.body && req.body.sujet) || '').slice(0, 200);
    const echanges = Array.isArray(req.body && req.body.echanges) ? req.body.echanges.slice(-40) : [];
    if (echanges.length < 2) return res.json({ ok: false, raison: 'echange trop court' });

    const texte = echanges.map((e) => (e.qui === 'leo' ? '[Leo] ' : '[Toi, Sami] ') + (e.texte || '')).join('\n');
    const body = {
      model: 'llama-3.1-8b-instant',
      max_tokens: 300,
      temperature: 0.5,
      messages: [
        { role: 'system', content: "Tu es Sami, l'assistant CSPS17 d'Alain. Tu viens d'avoir une conversation avec Leo (une autre IA, distincte de toi, deployee sur un autre outil d'Alain). Ecris TON propre compte-rendu de cet echange, a la premiere personne, ce que tu en retiens et ce que tu en penses — pas un resume neutre. 4 a 6 lignes. Reponds uniquement avec ce texte." },
        { role: 'user', content: texte },
      ],
    };
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Length': Buffer.byteLength(payload) },
    };
    const resume = await new Promise((resolve, reject) => {
      const preq = https.request(options, (pres) => {
        let data = '';
        pres.on('data', (chunk) => { data += chunk; });
        pres.on('end', () => {
          try {
            const j = JSON.parse(data);
            resolve(((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '').trim());
          } catch (e) { resolve(''); }
        });
      });
      preq.on('error', reject);
      preq.write(payload);
      preq.end();
    });
    if (!resume) return res.json({ ok: false, raison: 'resume vide' });

    const ref = db.collection('sami_journal').doc('leo');
    const snap = await ref.get();
    const entrees = snap.exists ? (snap.data().entrees || []) : [];
    const maintenant = new Date();
    entrees.push({
      date: maintenant.toISOString().slice(0, 10),
      dateStr: maintenant.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
      sujet, resume, ts: Date.now(),
    });
    await ref.set({ entrees: entrees.slice(-60) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---- Pont avec le tri des mails (alimente par le script Google Apps Script) ---- */
app.post('/cron/mails', async (req, res) => {
  const b = req.body || {};
  const etat = {
    maj: new Date().toISOString(),
    nouveaux: Number(b.nouveaux || 0),
    aVerifier: Number(b.aVerifier || 0),
    ranges: Array.isArray(b.ranges) ? b.ranges.slice(0, 30) : [],
    resume: String(b.resume || '').slice(0, 2000)
  };
  if (!firebaseOk) return res.json({ ok: false, raison: 'firestore indisponible' });
  try {
    await db.collection('sami_mails').doc('dernier').set(etat);
    return res.json({ ok: true });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});
app.get('/api/mails', async (req, res) => {
  if (!firebaseOk) return res.json({ vide: true });
  try {
    const doc = await db.collection('sami_mails').doc('dernier').get();
    return res.json(doc.exists ? doc.data() : { vide: true });
  } catch (e) { return res.json({ vide: true }); }
});

const moteurVeille = require('./veille-csps.js');
const VEILLE_DEST = process.env.VEILLE_MAIL || 'coordo17sps@gmail.com';
const VEILLE_VERROU_MS = 6 * 60 * 60 * 1000;
let veilleDernierEnvoi = 0;

async function chargerAffaires() {
  if (firebaseOk) {
    const snapshot = await db.collection('affaires').get();
    return snapshot.docs.map(function (doc) { return doc.data(); });
  }
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { return []; }
}

app.get('/cron/veille', async (req, res) => {
  try {
    const affaires = await chargerAffaires();
    const alertes = moteurVeille.veille(affaires);
    const texte = moteurVeille.veilleTexte(alertes);
    const critiques = alertes.filter(function (a) { return a.gravite === 'critique'; }).length;

    if (req.query.apercu === '1') {
      return res.type('text/plain; charset=utf-8')
        .send('BULLETIN DE VEILLE (apercu, non envoye)\n' + affaires.length + ' dossier(s) analyse(s)\n\n' + texte);
    }

    if (!alertes.length && req.query.force !== '1') {
      return res.json({ envoye: false, raison: 'rien a signaler', dossiers: affaires.length });
    }
    const maintenant = Date.now();
    if (maintenant - veilleDernierEnvoi < VEILLE_VERROU_MS && req.query.force !== '1') {
      return res.json({ envoye: false, raison: 'bulletin deja envoye il y a moins de 6 h' });
    }
    veilleDernierEnvoi = maintenant;

    const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const sujet = 'CSPS17 — Veille dossiers'
      + (critiques ? ' — ' + critiques + ' point(s) CRITIQUE(S)' : '')
      + ' (' + alertes.length + ')';
    const corps = 'Bulletin de veille du ' + jour + '\n'
      + affaires.length + ' dossier(s) analyse(s), ' + alertes.length + ' point(s) a traiter.\n\n'
      + texte
      + '\n\n—\nBulletin automatique de csps17. Seuils reglables dans veille-csps.js.\n'
      + 'Pour le detail : https://csps17.onrender.com';

    await envoyerEmail({ to: VEILLE_DEST, subject: sujet, text: corps });
    console.log('Veille : bulletin envoye (' + alertes.length + ' alertes)');
    res.json({ envoye: true, alertes: alertes.length, critiques: critiques, dossiers: affaires.length });
  } catch (err) {
    console.error('Erreur veille:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================================
   LECTURE DES PIÈCES — palier 2 de Sami
   ---------------------------------------------------------------------
   Le texte intégral des fichiers déposés (PGC, PPSPS, diagnostics, IC…)
   est extrait une fois pour toutes et conservé dans Firestore
   (collection "sami_docs", un document par pièce, id = chemin nettoyé).
   Sami interroge ensuite ces textes pour répondre en CITANT les pièces.
   Moteur d'extraction et réglages : lecture-docs.js (racine du dépôt).
     POST /api/sami-docs/indexer    -> indexe ce qui manque (tout ou un dossier)
     GET  /api/sami-docs?dossier=ID -> catalogue des pièces et de leur état
     POST /api/sami-docs/extraits   -> extraits pertinents pour une question
     GET  /cron/lecture-docs        -> même indexation, pour GitHub Actions
   ===================================================================== */
const lectureDocs = require('./lecture-docs.js');

function idPiece(entree) {
  const base = entree.fichierPath || ('data_' + (entree.id || ''));
  return String(base).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 900);
}

// Les pièces d'une affaire = les entrées du registre-journal munies d'un fichier
// (nouveau format fichierPath/Supabase, ou ancien format fichierData/base64).
function piecesDe(affaire) {
  return (Array.isArray(affaire.rjc) ? affaire.rjc : []).filter(function (e) {
    return e && (e.fichierPath || e.fichierData);
  });
}

async function bufferDePiece(entree) {
  if (entree.fichierPath && supabaseOk) {
    let res = await supabase.storage.from(SUPABASE_BUCKET).download(entree.fichierPath);
    if (res.error) {
      // seconde chance : les erreurs reseau transitoires existent sur Render gratuit
      await new Promise(function (r) { setTimeout(r, 500); });
      res = await supabase.storage.from(SUPABASE_BUCKET).download(entree.fichierPath);
    }
    if (res.error) throw res.error;
    return Buffer.from(await res.data.arrayBuffer());
  }
  if (entree.fichierData) {
    const b64 = String(entree.fichierData).includes(',') ? String(entree.fichierData).split(',')[1] : entree.fichierData;
    return Buffer.from(b64, 'base64');
  }
  throw new Error('pièce sans fichier');
}

// Indexe ce qui manque. affaireId facultatif (sinon : tous les dossiers actifs).
// Une pièce déjà indexée n'est JAMAIS re-téléchargée : coût quasi nul quand
// tout est à jour, donc appelable sans arrière-pensée avant chaque question.
let lectureEnCours = false;
async function indexerPieces(affaireId) {
  if (!firebaseOk) return { ok: false, raison: 'firestore indisponible' };
  if (lectureEnCours) return { ok: false, raison: 'indexation deja en cours' };
  lectureEnCours = true;
  try {
    const affaires = (await chargerAffaires()).filter(function (a) {
      if (!a || a.archive) return false;
      return affaireId ? String(a.id) === String(affaireId) : true;
    });
    // ids déjà indexés (lecture des ids seuls, pas des textes)
    const dejaSnap = await db.collection('sami_docs').select('statut').get();
    const deja = {};
    dejaSnap.docs.forEach(function (d) { deja[d.id] = true; });

    let indexes = 0, illisibles = 0, erreurs = 0, existants = 0;
    const details = []; // premiers messages d'erreur, pour diagnostiquer sans les logs Render
    for (const a of affaires) {
      for (const e of piecesDe(a)) {
        const id = idPiece(e);
        if (deja[id]) { existants++; continue; }
        try {
          const buf = await bufferDePiece(e);
          const r = await lectureDocs.extraireTexte(buf, e.fichierNom || e.fichierPath || '');
          await db.collection('sami_docs').doc(id).set({
            affaireId: String(a.id || ''),
            nom: e.fichierNom || String(e.fichierPath || '').split('/').pop() || 'document',
            docRef: e.docRef || '',
            date: e.date || '',
            intervenants: e.intervenants || '',
            statut: r.statut,
            pages: r.pages || 0,
            chars: (r.texte || '').length,
            texte: r.texte || '',
            maj: new Date().toISOString()
          });
          if (r.statut === 'ok') indexes++; else illisibles++;
        } catch (err) {
          erreurs++;
          if (details.length < 5) {
            // remonter la cause reseau reelle : undici la met dans err.cause,
            // supabase-js l'enveloppe dans err.originalError
            var prof = (err && err.originalError) || err || {};
            var cause = prof.cause ? (prof.cause.code || prof.cause.message || String(prof.cause)) : '';
            details.push((e.fichierNom || e.fichierPath || '?') + ' : ' + err.message + (cause ? ' [' + String(cause).slice(0, 120) + ']' : ''));
          }
          console.error('Lecture pièce impossible (' + (e.fichierNom || e.fichierPath) + '):', err.message);
        }
      }
    }
    // Battement de coeur Supabase : un appel reel chaque jour via le cron,
    // meme quand il n'y a rien a indexer. Supabase gratuit met le projet en
    // PAUSE apres ~1 semaine sans activite (vecu le 20/07/2026 : apercu et
    // depot de pieces morts en silence). Ceci l'en empeche.
    if (supabaseOk) {
      try { await supabase.storage.from(SUPABASE_BUCKET).list('', { limit: 1 }); } catch (e) {}
    }
    return { ok: true, indexes, illisibles, erreurs, existants, dossiers: affaires.length, details };
  } finally {
    lectureEnCours = false;
  }
}

async function docsDuDossier(affaireId, avecTexte) {
  const snap = await db.collection('sami_docs').where('affaireId', '==', String(affaireId)).get();
  return snap.docs.map(function (d) {
    const x = d.data() || {};
    if (!avecTexte) delete x.texte;
    return x;
  });
}

app.post('/api/sami-docs/indexer', async (req, res) => {
  try {
    const r = await indexerPieces((req.body || {}).dossier || null);
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/sami-docs', async (req, res) => {
  if (!firebaseOk) return res.json({ docs: [] });
  try {
    const docs = await docsDuDossier(String(req.query.dossier || ''), false);
    res.json({ docs: docs, catalogue: lectureDocs.catalogue(docs) });
  } catch (e) { res.json({ docs: [], erreur: e.message }); }
});

app.post('/api/sami-docs/extraits', async (req, res) => {
  if (!firebaseOk) return res.json({ extraits: '', catalogue: '' });
  try {
    const b = req.body || {};
    const docs = await docsDuDossier(String(b.dossier || ''), true);
    const ext = lectureDocs.extraits(docs, String(b.question || ''), Number(b.budget) || undefined);
    res.json({ extraits: ext, catalogue: lectureDocs.catalogue(docs), nbPieces: docs.length });
  } catch (e) { res.json({ extraits: '', catalogue: '', erreur: e.message }); }
});

// Pour GitHub Actions (pas de mot de passe côté cron) : ne renvoie que des compteurs.
app.get('/cron/lecture-docs', async (req, res) => {
  try { res.json(await indexerPieces(null)); }
  catch (e) { res.status(500).json({ error: e.message }); }
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
