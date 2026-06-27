use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
 
const app = express();
const PORT = process.env.PORT || 3017;
const DATA_FILE = path.join(__dirname, 'data', 'affaires.json');
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
 
// Créer le dossier data s'il n'existe pas
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
 
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));
 
// ── PROXY API Anthropic ───────────────────────────────────────────
app.post('/api/claude', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'Clé API Anthropic non configurée sur le serveur' });
  }
  try {
    const { default: fetch } = await import('node-fetch');
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
 
// ── AFFAIRES — lecture ────────────────────────────────────────────
app.get('/api/affaires', (req, res) => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.json([]);
  }
});
 
// ── AFFAIRES — sauvegarde ─────────────────────────────────────────
app.post('/api/affaires', (req, res) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// ── MANIFEST PWA ──────────────────────────────────────────────────
app.get('/manifest.json', (req, res) => {
  res.json({
    name: 'CSPS17 — Coordination SPS',
    short_name: 'CSPS17',
    description: 'Gestionnaire de coordination SPS — Alain SUZANNE',
    start_url: '/',
    display: 'standalone',
    background_color: '#1F4E79',
    theme_color: '#1F4E79',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ],
    categories: ['business', 'productivity'],
    lang: 'fr'
  });
});
 
// ── SERVICE WORKER (offline) ──────────────────────────────────────
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
const CACHE = 'csps17-v1';
const ASSETS = ['/', '/manifest.json'];
 
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
 
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
 
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return; // pas de cache pour les API
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
  `);
});
 
// ── FALLBACK ──────────────────────────────────────────────────────
app.get('*', (req, res) => {
  const indexPub = path.join(__dirname, 'public', 'index.html');
  const indexRoot = path.join(__dirname, 'index.html');
  if (require('fs').existsSync(indexPub)) res.sendFile(indexPub);
  else res.sendFile(indexRoot);
});
 
app.listen(PORT, () => {
  console.log(`✅ CSPS17 lancé sur http://localhost:${PORT}`);
});
