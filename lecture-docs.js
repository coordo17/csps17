/* =======================================================================
   LECTURE-DOCS — palier 2 de Sami : lire le contenu réel des pièces
   -----------------------------------------------------------------------
   Jusqu'ici Sami COMPTAIT les PGC, PPSPS et diagnostics sans les lire.
   Ce module extrait le texte intégral des fichiers déposés (PDF, DOCX,
   TXT) et sélectionne les passages utiles à une question donnée, pour
   que Sami réponde en citant les pièces du dossier — pas de mémoire,
   pas d'invention.

   Il se pose à la racine du dépôt csps17, à côté de veille-csps.js.
   Côté serveur uniquement (Node) : l'extraction utilise pdf-parse et
   mammoth (déclarés dans package.json).

   Les scans purs (PDF image, sans couche texte) SONT désormais océrisés
   par Gemini vision (même principe qu'Harmo) quand la clé GEMINI_API_KEY
   est présente dans l'environnement. Sans clé, on garde l'ancien
   comportement : le scan est marqué « scan illisible ».
   ======================================================================= */

'use strict';

/* ------------------------ RÉGLAGES (à ajuster ici) ------------------------ */
var REGLAGES = {
  maxCharsParDoc: 250000,   // plafond de texte conservé par pièce (limite 1 Mo/document Firestore)
  maxPagesPdf: 60,          // au-delà, on s'arrête (un PGC fait rarement plus)
  seuilScan: 200,           // moins de N caractères utiles dans un PDF -> considéré comme scan illisible
  tailleMorceau: 1100,      // taille visée d'un morceau (extrait candidat), en caractères
  budgetExtraits: 7000,     // budget total d'extraits injectés dans le prompt de Sami
  maxExtraitsParDoc: 3,     // pour qu'une seule grosse pièce ne mange pas tout le budget
  ocrMaxOctets: 14 * 1024 * 1024, // au-delà, envoi inline Gemini refusé (limite requête ~20 Mo une fois en base64)
  ocrTimeoutMs: 90000,      // l'OCR d'un PDF scanné peut être long : on laisse de la marge
  ocrMaxTokens: 16384       // plafond de texte restitué par l'OCR (un PPSPS scanné très long peut être tronqué)
};

/* ------------------------ OCR DES SCANS (Gemini vision) ------------------------
   Un PDF sans couche texte (scan pur) ne peut pas être lu par pdf.js. On envoie
   alors le PDF entier à Gemini (inlineData PDF, il l'océrise nativement — même
   approche qu'Harmo). La clé se lit dans l'environnement ; elle n'est jamais
   écrite dans le code. Toute erreur (pas de clé, quota, fichier trop gros, panne)
   fait retomber proprement sur l'ancien comportement « scan illisible ».        */
var GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
var GEMINI_MODEL   = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

async function ocrPdfGemini(buffer) {
  if (!GEMINI_API_KEY) return null;                              // pas de clé -> scan illisible (comme avant)
  if (!buffer || buffer.length > REGLAGES.ocrMaxOctets) return null; // trop volumineux pour l'envoi inline
  var prompt = 'Transcris integralement, en texte brut, tout le contenu de ce document '
    + '(un PPSPS ou une piece de chantier), page apres page. Restitue les titres, les '
    + 'tableaux sous forme de texte lisible, les listes et les mentions manuscrites si '
    + 'presentes. Ne resume pas, ne commente pas : donne uniquement le texte du document.';
  var body = {
    contents: [{ role: 'user', parts: [
      { text: prompt },
      { inlineData: { mimeType: 'application/pdf', data: buffer.toString('base64') } }
    ]}],
    generationConfig: { maxOutputTokens: REGLAGES.ocrMaxTokens, temperature: 0 }
  };
  var ctrl = new AbortController();
  var minuteur = setTimeout(function () { ctrl.abort(); }, REGLAGES.ocrTimeoutMs);
  try {
    var r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent',
      { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify(body),
        signal: ctrl.signal }
    );
    if (!r.ok) return null;
    var j = await r.json();
    var parts = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
    var t = parts ? parts.map(function (p) { return p.text || ''; }).join('') : '';
    t = String(t).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    return t.length >= REGLAGES.seuilScan ? t : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(minuteur);
  }
}

/* ------------------------ OUTILS ------------------------ */
function norm(x) {
  return String(x || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

var MOTS_VIDES = ('le la les un une des du de d au aux et ou mais donc or ni car que qui quoi dont ce cet cette ces son sa ses mon ma mes ton ta tes leur leurs notre nos votre vos il elle ils elles on nous vous je tu se sont est etait etre avoir a ont dans sur sous pour par avec sans chez vers entre pendant avant apres plus moins tres bien tout tous toute toutes autre autres meme aussi comme alors ainsi cela ca fait faire faut peut doit dois quel quelle quels quelles est ce qu il y en ne pas non oui si').split(' ');

function motsCles(question) {
  var vus = {};
  return norm(question).split(' ').filter(function (m) {
    if (m.length < 3 || MOTS_VIDES.indexOf(m) >= 0 || vus[m]) return false;
    vus[m] = true; return true;
  });
}

/* ------------------------ EXTRACTION ------------------------ */
/* extraireTexte(buffer, nomFichier) -> { statut, texte, pages }
   statut : 'ok' | 'scan' (PDF sans couche texte) | 'inconnu' (format non géré) */
async function extraireTexte(buffer, nomFichier) {
  var nom = String(nomFichier || '').toLowerCase();
  if (nom.endsWith('.pdf')) {
    // pdfjs-dist, MEME version que le pdf.js du client (3.11.174) : ce qui se
    // lit sur la tablette se lit sur le serveur. (pdf-parse écarté : il embarque
    // un pdf.js de 2018 qui refuse les PDF récents — « bad XRef entry ».)
    var pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    var doc = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false
    }).promise;
    var nbPages = Math.min(doc.numPages, REGLAGES.maxPagesPdf);
    var t = '';
    for (var i = 1; i <= nbPages; i++) {
      var page = await doc.getPage(i);
      var tc = await page.getTextContent();
      t += tc.items.map(function (it) { return it.str; }).join(' ') + '\n\n';
      if (t.length > REGLAGES.maxCharsParDoc) break;
    }
    try { await doc.destroy(); } catch (e) {}
    var texte = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (texte.length < REGLAGES.seuilScan) {
      // PDF sans couche texte = scan. On tente l'OCR Gemini (si clé présente) ;
      // en cas d'echec on retombe sur l'ancien marquage « scan illisible ».
      var ocr = await ocrPdfGemini(buffer);
      if (ocr) return { statut: 'ok', texte: ocr.slice(0, REGLAGES.maxCharsParDoc), pages: doc.numPages || 0, ocr: true };
      return { statut: 'scan', texte: '', pages: doc.numPages || 0 };
    }
    return { statut: 'ok', texte: texte.slice(0, REGLAGES.maxCharsParDoc), pages: doc.numPages || 0 };
  }
  if (nom.endsWith('.docx')) {
    var mammoth = require('mammoth');
    var out = await mammoth.extractRawText({ buffer: buffer });
    var t = String(out.value || '').replace(/\n{3,}/g, '\n\n').trim();
    return { statut: t.length ? 'ok' : 'scan', texte: t.slice(0, REGLAGES.maxCharsParDoc), pages: 0 };
  }
  if (/\.(txt|csv|json|md|html?)$/.test(nom)) {
    var brut = buffer.toString('utf8').trim();
    return { statut: brut.length ? 'ok' : 'scan', texte: brut.slice(0, REGLAGES.maxCharsParDoc), pages: 0 };
  }
  // images, zip, xlsx... : pas de texte exploitable dans ce palier
  return { statut: 'inconnu', texte: '', pages: 0 };
}

/* ------------------------ DÉCOUPAGE EN MORCEAUX ------------------------ */
function decouper(texte) {
  var morceaux = [];
  var paras = String(texte || '').split(/\n\s*\n/);
  var courant = '';
  for (var i = 0; i < paras.length; i++) {
    var p = paras[i].trim();
    if (!p) continue;
    if (courant && (courant.length + p.length + 2) > REGLAGES.tailleMorceau) {
      morceaux.push(courant); courant = '';
    }
    // un paragraphe seul plus gros que la taille visée : on le tranche
    while (p.length > REGLAGES.tailleMorceau * 1.5) {
      var coupe = p.lastIndexOf('. ', REGLAGES.tailleMorceau);
      if (coupe < REGLAGES.tailleMorceau * 0.4) coupe = REGLAGES.tailleMorceau;
      morceaux.push((courant ? courant + '\n' : '') + p.slice(0, coupe + 1).trim());
      courant = ''; p = p.slice(coupe + 1).trim();
    }
    courant = courant ? courant + '\n' + p : p;
  }
  if (courant) morceaux.push(courant);
  return morceaux;
}

/* ------------------------ SÉLECTION DES EXTRAITS ------------------------ */
/* docs = [{ nom, docRef, texte, statut }] (les textes déjà indexés d'UN dossier)
   question = la question d'Alain
   -> chaîne prête à injecter dans le prompt, ou '' si rien d'utile.       */
function extraits(docs, question, budget) {
  budget = budget || REGLAGES.budgetExtraits;
  var cles = motsCles(question);
  var candidats = [];

  (docs || []).forEach(function (d) {
    if (!d || d.statut !== 'ok' || !d.texte) return;
    var nomNorm = norm(d.nom);
    // la pièce est-elle citée nommément dans la question ? (bonus fort)
    var citee = cles.some(function (k) { return nomNorm.indexOf(k) >= 0; });
    var morceaux = decouper(d.texte);
    morceaux.forEach(function (m, idx) {
      var mNorm = norm(m), score = 0;
      cles.forEach(function (k) {
        var n = 0, pos = mNorm.indexOf(k);
        while (pos >= 0 && n < 5) { n++; pos = mNorm.indexOf(k, pos + k.length); }
        score += n;
      });
      if (citee) score += (idx === 0 ? 4 : 2);       // pièce nommée : son début + ses morceaux remontent
      if (score > 0) candidats.push({ doc: d, idx: idx, total: morceaux.length, texte: m, score: score });
    });
  });

  candidats.sort(function (a, b) { return b.score - a.score; });

  var pris = [], parDoc = {}, taille = 0;
  for (var i = 0; i < candidats.length; i++) {
    var c = candidats[i];
    var cle = c.doc.nom;
    if ((parDoc[cle] || 0) >= REGLAGES.maxExtraitsParDoc) continue;
    if (taille + c.texte.length > budget) { if (pris.length) continue; }
    pris.push(c); parDoc[cle] = (parDoc[cle] || 0) + 1; taille += c.texte.length;
    if (taille >= budget) break;
  }
  if (!pris.length) return '';

  // regroupés par pièce, dans l'ordre du document
  pris.sort(function (a, b) {
    return a.doc.nom === b.doc.nom ? a.idx - b.idx : String(a.doc.nom).localeCompare(String(b.doc.nom));
  });
  var L = [], dernier = '';
  pris.forEach(function (c) {
    if (c.doc.nom !== dernier) {
      dernier = c.doc.nom;
      L.push('— ' + c.doc.nom + (c.doc.docRef ? ' (' + c.doc.docRef + ')' : '') + ' —');
    }
    L.push('[extrait ' + (c.idx + 1) + '/' + c.total + '] ' + c.texte);
  });
  return L.join('\n');
}

/* ------------------------ CATALOGUE ------------------------ */
/* Liste courte des pièces d'un dossier et de leur état de lecture,
   pour que Sami sache ce qui existe et ce qu'il n'a PAS pu lire.  */
function catalogue(docs) {
  if (!docs || !docs.length) return '';
  return docs.map(function (d) {
    var etat = d.statut === 'ok' ? Math.max(1, Math.round((d.chars || (d.texte || '').length) / 1000)) + ' k car. lus'
      : d.statut === 'scan' ? 'scan non lisible (pas de couche texte)'
      : 'format non lu';
    return '- ' + d.nom + (d.docRef ? ' [' + d.docRef + ']' : '') + (d.date ? ' (' + d.date + ')' : '') + ' : ' + etat;
  }).join('\n');
}

module.exports = {
  REGLAGES: REGLAGES,
  extraireTexte: extraireTexte,
  decouper: decouper,
  extraits: extraits,
  catalogue: catalogue,
  _motsCles: motsCles,
  _norm: norm
};
