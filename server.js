const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const admin = require('firebase-admin');
const app = express();
const PORT = process.env.PORT || 3017;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
app.use(express.json({ limit: '20mb' }));
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
