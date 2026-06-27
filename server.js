const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3017;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';

app.use(express.json({ limit: '20mb' }));

// Servir les fichiers statiques depuis la racine ET public/
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Proxy API Anthropic
app.post('/api/claude', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'Cle API Anthropic non configuree' });
  }
  try {
    const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
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
