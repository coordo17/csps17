const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');

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

// Sauvegarde affaires
const DATA_FILE = path.join(__dirname, 'affaires.json');
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

app.get('/api/affaires', (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/affaires', (req, res) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2), 'utf8');
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
