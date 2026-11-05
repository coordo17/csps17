const express = require('express');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 3017;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

app.use(express.json({ limit: '10mb' }));

// ── CORS : l'appli est sur coordo17.github.io, ce serveur sur onrender.com
// (deux origines differentes) ── sans ca le navigateur bloque toute reponse.
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', 'https://coordo17.github.io');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-App-Password');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Authentification simple (mot de passe partage via variable APP_PASSWORD) ──
// Tant que APP_PASSWORD n'est pas definie sur Render, l'API reste ouverte.
app.use('/api', function (req, res, next) {
  if (!process.env.APP_PASSWORD) return next();
  const fourni = req.headers['x-app-password'] || '';
  if (fourni === process.env.APP_PASSWORD) return next();
  return res.status(401).json({ error: 'Mot de passe requis ou invalide' });
});

app.get('/', function (req, res) { res.send('CSPS17 API : OK'); });

// Redaction texte par Gemini (francais propre) : utilisee en priorite par
// /api/claude pour tout texte pur (pas de photo). La cle GEMINI_API_KEY se
// lit dans l'environnement.
async function appelGeminiTexte(systemText, userText, maxTokens) {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) throw new Error('GEMINI_API_KEY absente');
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const body = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: { maxOutputTokens: maxTokens || 4096, temperature: 0.2 }
  };
  const ctrl = new AbortController();
  const to = setTimeout(function () { ctrl.abort(); }, 60000);
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body), signal: ctrl.signal });
    if (!r.ok) throw new Error('Gemini HTTP ' + r.status);
    const j = await r.json();
    const parts = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
    const text = parts ? parts.map(function (x) { return x.text || ''; }).join('') : '';
    if (!text) throw new Error('Gemini reponse vide');
    return text;
  } finally {
    clearTimeout(to);
  }
}

// Proxy IA (compatible messages type Anthropic) : Gemini pour la redaction
// texte, Groq en secours + pour la vision (description de photo de visite).
// Seule fonction IA conservee dans CSPS17 (decision du 28/09) : la description
// de photo, limitee a l'ecran CR de visite / DGI cote client.
app.post('/api/claude', async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Cle API Groq non configuree' });
  }
  try {
    const MODELES_OK = ['openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];
    const modele = MODELES_OK.indexOf(req.body.model) !== -1 ? req.body.model : 'qwen/qwen3.6-27b';
    const body = {
      model: modele,
      max_tokens: req.body.max_tokens || 4096,
      messages: req.body.messages || [],
    };
    body.reasoning_effort = req.body.reasoning_effort || 'none';
    if (req.body.reasoning_format) body.reasoning_format = req.body.reasoning_format;
    const STYLE_CSPS = "Directive de style CSPS17, a appliquer a tout texte que tu rediges, y compris les champs texte d'un JSON (n'altere jamais la STRUCTURE d'un JSON demande, seulement la qualite du texte a l'interieur) : "
      + "1) Francais correct, sans faute d'accord ni coquille (jamais \"d'personnels\" : ecris \"de personnels\"). "
      + "2) Bannis les formules creuses et interchangeables (\"respecter les consignes de securite\", \"mettre en place des mesures de securite\") : chaque affirmation doit nommer une zone, une phase, un corps d'etat, une date ou une mesure precise ; a defaut, ne l'ecris pas. "
      + "3) Ton sobre et professionnel de coordonnateur SPS : pas de majuscules criardes, pas de points d'exclamation superflus. "
      + "4) Ne mentionne jamais qu'un texte est genere, redige ou assiste par une IA.";
    const sysContent = req.body.system ? (STYLE_CSPS + '\n\n' + req.body.system) : STYLE_CSPS;
    const estVision = (req.body.messages || []).some(function (m) { return m && typeof m.content !== 'string'; });
    if (!estVision) {
      try {
        const userText = (req.body.messages || []).map(function (m) { return typeof m.content === 'string' ? m.content : ''; }).join('\n\n');
        const gemTxt = await appelGeminiTexte(sysContent, userText, req.body.max_tokens);
        return res.json({ content: [{ type: 'text', text: gemTxt }] });
      } catch (eGem) {
        console.warn('Gemini KO, bascule Groq:', eGem.message);
      }
    }
    body.messages = [{ role: 'system', content: sysContent }, ...body.messages];
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
          const anthropicFormat = {
            content: [{ type: 'text', text: (groqData.choices && groqData.choices[0] && groqData.choices[0].message && groqData.choices[0].message.content) || '' }],
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

app.listen(PORT, function () {
  console.log('CSPS17 API (minimal) en ecoute sur le port ' + PORT);
});
