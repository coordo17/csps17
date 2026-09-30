// ============================================================================
// INTERVENANTS : sous-traitants et prestataires rattaches a leur entreprise
// FICHE D'INSPECTION COMMUNE complete (plus jamais vierge)
// Decisions d'Alain 30/09 soir (points 1 a 13) — sources : R.4532-13, R.4532-38,
// R.4532-66 (Legifrance) ; OPPBTP (IC avec chaque entreprise sauf prestataires) ;
// guide CARSAT Alsace-Moselle / Nord-Est / OPPBTP A.302 11/2023 (emargement,
// convocation titulaire + sous-traitants, 9 PGP, points PPSPS, diffusion MOA/MOE).
// ============================================================================

// ---------- 1. Intervenants ----------
function icNouvelId() { return 'e' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
function icEscAttr(s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

function icCarteEntreprise(div, type) {
  var body = div.querySelector('.entreprise-card-body');
  if (!body) return;
  var hid = document.createElement('input');
  hid.type = 'hidden'; hid.className = 'ent-id'; hid.value = icNouvelId();
  body.insertBefore(hid, body.firstChild);
  if (type !== 'principale') {
    var row = document.createElement('div');
    row.className = 'form-row';
    row.innerHTML = '<div class="field"><label>Pour le compte de (entreprise donneuse d\u2019ordre)</label>'
      + '<select class="ent-parent" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:14px;"></select></div>';
    body.insertBefore(row, hid.nextSibling);
    var sel = row.querySelector('select');
    sel.addEventListener('focus', function () { icMajSelectsParent(); });
    sel.addEventListener('change', function () {
      var p = icCarteParId(sel.value);
      var lot = div.querySelector('.ent-lot');
      if (p && lot && !lot.value) lot.value = (p.querySelector('.ent-lot') || {}).value || '';
      icRegrouperEntreprises();
    });
  }
  var nom = div.querySelector('.ent-nom');
  if (nom) nom.addEventListener('change', function () { icMajSelectsParent(); icRegrouperEntreprises(); });
  // Regroupement differe : le chargement d'une affaire (et l'import) remplissent
  // la derniere carte ajoutee ; on ne reordonne qu'une fois la boucle terminee.
  clearTimeout(window._icRegroupT);
  window._icRegroupT = setTimeout(function () { icMajSelectsParent(); icRegrouperEntreprises(); }, 0);
}

function icCartes() { return Array.prototype.slice.call(document.querySelectorAll('#entreprise-list .entreprise-card')); }
function icCarteVal(card, cls) { var el = card.querySelector('.' + cls); return el ? el.value : ''; }
function icCarteParId(id) {
  if (!id) return null;
  return icCartes().filter(function (c) { return icCarteVal(c, 'ent-id') === id; })[0] || null;
}

function icMajSelectsParent() {
  var cartes = icCartes();
  cartes.forEach(function (card) {
    var sel = card.querySelector('.ent-parent');
    if (!sel) return;
    var actuel = sel.value || sel.getAttribute('data-parent') || '';
    var monId = icCarteVal(card, 'ent-id');
    var opts = '<option value="">\u2014 \u00e0 rattacher \u2014</option>';
    cartes.forEach(function (c) {
      var t = icCarteVal(c, 'ent-type');
      var id = icCarteVal(c, 'ent-id');
      if (id === monId || t === 'prestataire') return;
      opts += '<option value="' + icEscAttr(id) + '"' + (id === actuel ? ' selected' : '') + '>'
        + icEscAttr(icCarteVal(c, 'ent-nom') || '(sans nom)') + (icCarteVal(c, 'ent-lot') ? ' \u2014 ' + icEscAttr(icCarteVal(c, 'ent-lot')) : '')
        + (t === 'sous-traitant' ? ' (sous-traitant)' : '') + '</option>';
    });
    sel.innerHTML = opts;
    sel.value = actuel;
    if (sel.value !== actuel) sel.value = '';
    sel.setAttribute('data-parent', sel.value);
  });
}

// Affichage par lot : l'entreprise principale, puis ses sous-traitants et
// prestataires en retrait ; les non rattaches en fin de liste, en orange.
function icRegrouperEntreprises() {
  var liste = document.getElementById('entreprise-list');
  if (!liste) return;
  var cartes = icCartes();
  var parent = {};
  cartes.forEach(function (c) { parent[icCarteVal(c, 'ent-id')] = icCarteVal(c, 'ent-parent'); });
  var ordre = [], vus = {};
  function ajouter(c, niveau) {
    var id = icCarteVal(c, 'ent-id');
    if (vus[id]) return; vus[id] = true;
    c.style.marginLeft = (niveau * 28) + 'px';
    c.style.borderLeft = niveau ? '4px solid #93c5fd' : '';
    ordre.push(c);
    cartes.forEach(function (e) { if (parent[icCarteVal(e, 'ent-id')] === id) ajouter(e, niveau + 1); });
  }
  cartes.forEach(function (c) { if (icCarteVal(c, 'ent-type') === 'principale') ajouter(c, 0); });
  cartes.forEach(function (c) {
    if (vus[icCarteVal(c, 'ent-id')]) return;
    var orph = !icCarteParId(parent[icCarteVal(c, 'ent-id')]);
    ajouter(c, 0);
    if (orph) { c.style.borderLeft = '4px solid #f59e0b'; }
  });
  ordre.forEach(function (c) { liste.appendChild(c); });
  cartes.forEach(function (c) {
    var head = c.querySelector('.entreprise-card-head span');
    if (!head) return;
    var p = icCarteParId(parent[icCarteVal(c, 'ent-id')]);
    var t = icCarteVal(c, 'ent-type');
    var base = t === 'principale' ? 'Principale' : t === 'sous-traitant' ? 'Sous-traitant' : 'Prestataire';
    var nom = icCarteVal(c, 'ent-nom');
    head.textContent = base + (nom ? ' \u2014 ' + nom : '') + (p ? ' (pour ' + (icCarteVal(p, 'ent-nom') || '?') + ')' : (t !== 'principale' ? ' \u2014 \u00e0 rattacher' : ''));
  });
}

function icApresChargementEntreprises(ents) {
  var cartes = icCartes();
  (ents || []).forEach(function (ent, i) {
    var c = cartes[i]; if (!c) return;
    var hid = c.querySelector('.ent-id'); if (hid && ent.id) hid.value = ent.id;
    var sel = c.querySelector('.ent-parent'); if (sel) sel.setAttribute('data-parent', ent.parent || '');
  });
  icMajSelectsParent();
  icRegrouperEntreprises();
}

// Terrain : entreprises de l'affaire avec leurs liens
function icEntreprises() { return (terrainAffaire && terrainAffaire.entreprises) || []; }
function icEntParId(id) { return icEntreprises().filter(function (e) { return e.id && e.id === id; })[0] || null; }
function icEnfants(ent, type) {
  if (!ent || !ent.id) return [];
  return icEntreprises().filter(function (e) { return e.parent === ent.id && (!type || e.type === type); });
}
function icLibelleEntreprise(e, i) {
  var p = icEntParId(e.parent);
  return (e.nom || 'Entreprise ' + (i + 1)) + (e.lot ? ' \u2014 ' + e.lot : '')
    + (e.type === 'sous-traitant' ? ' (sous-traitant' + (p ? ' de ' + p.nom : '') + ')' : '');
}
// Les prestataires n'ont pas d'IC propre (OPPBTP) : ils figurent sur la fiche de
// l'entreprise pour le compte de laquelle ils interviennent.
function icOptionsEntreprises() {
  var h = '';
  icEntreprises().forEach(function (e, i) {
    if (e.type === 'prestataire') return;
    h += '<option value="' + i + '">' + icEscAttr(icLibelleEntreprise(e, i)) + '</option>';
  });
  return h;
}

// ---------- 2. Formulaire terrain ----------
function icRepresentantHtml() {
  return '<div class="field" style="margin-bottom:10px;"><label>Qualit\u00e9 du repr\u00e9sentant rencontr\u00e9</label>'
    + '<select id="ic-rep-qualite" onchange="document.getElementById(\'ic-deleg-wrap\').style.display = this.value === \'Compagnon\' ? \'block\' : \'none\';" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:14px;">'
    + '<option value="">\u2014 choisir \u2014</option><option>Dirigeant</option><option>Conducteur de travaux</option><option>Chef de chantier</option><option>Compagnon</option></select></div>'
    + '<div id="ic-deleg-wrap" style="display:none;margin-bottom:10px;padding:8px;border:1px solid #f59e0b;border-radius:6px;background:#fffbeb;font-size:13px;">'
    + '<label style="display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" id="ic-rep-deleg" style="width:18px;height:18px;margin-top:2px;"> '
    + 'D\u00e9l\u00e9gation confirm\u00e9e : le compagnon repr\u00e9sente l\u2019entreprise pour cette IC (il sera nomm\u00e9 au compte rendu).</label></div>'
    + '<div id="ic-st-de" style="display:none;margin-bottom:10px;padding:8px;border:1px solid #93c5fd;border-radius:6px;background:#eff6ff;font-size:13px;"></div>';
}

function icPrestatairesHtml() {
  return '<div class="terrain-section"><div class="terrain-section-header">&#128666; Prestataires intervenant pour le compte de l\u2019entreprise</div><div class="terrain-section-body">'
    + '<p style="font-size:12px;color:var(--text-light);margin-bottom:6px;">Pas d\u2019IC propre (OPPBTP) : l\u2019entreprise leur transmet les conditions d\u00e9finies ici et traite leurs risques dans son PPSPS.</p>'
    + fieldRow('Prestataires', 'ic-prestataires', 'text', 'Ex : location nacelle, pose de filets', '')
    + '</div></div>';
}

// Grille des sections 4, 5, 6, 8, 9, 10 : une ligne par ligne du modele Word.
var IC_GRILLE = [
  { sec: '4', titre: 'Informations pr\u00e9alables re\u00e7ues de l\u2019entreprise', ancre: 'Document / Information', items: [
    ['mo', 'Mode op\u00e9ratoire d\u00e9taill\u00e9 des travaux confi\u00e9s', 'recu'], ['caces', 'Autorisation de conduite des engins / CACES', 'recu'],
    ['eff', 'Effectif, dates et dur\u00e9e pr\u00e9visible d\u2019intervention', 'recu'], ['st', 'Coordonn\u00e9es des sous-traitants \u00e9ventuels', 'recu'],
    ['ppsps', 'PPSPS transmis au CSPS (si requis)', 'recu']] },
  { sec: '5A', titre: 'Installation g\u00e9n\u00e9rale', ancre: '5A \u2014 Installation', items: [
    ['cloture', 'Emprise / cl\u00f4ture', 'oc'], ['basevie', 'Base vie / sanitaires', 'oc'], ['stock', 'Stockage mat\u00e9riaux', 'oc'],
    ['bennes', 'Bennes / tri d\u00e9chets', 'oc'], ['station', 'Stationnement engins', 'oc']] },
  { sec: '5B', titre: '\u00c9lectricit\u00e9 / Eau', ancre: '5A \u2014 Installation', items: [
    ['coffret', 'Coffret \u00e9lec. normalis\u00e9 30mA', 'oc'], ['groupe', 'Groupe \u00e9lectrog\u00e8ne', 'oc'], ['eclair', '\u00c9clairage chantier', 'oc'],
    ['eau', 'Raccordement eau potable', 'oc'], ['lav5b', 'Eau personnel / lavage roues', 'oc']] },
  { sec: '5C', titre: 'Plan de circulation', ancre: '5C \u2014 Plan de circulation', items: [
    ['plancirc', 'Plan de circ. \u00e9tabli / affich\u00e9', 'oc'], ['sep', 'S\u00e9paration engins / pi\u00e9tons', 'oc'], ['vitesse', 'Vitesse limit\u00e9e', 'vit'],
    ['signaleur', 'Signaleur lors des man\u0153uvres', 'oc'], ['lavroues', 'Lavage roues avant sortie', 'oc']] },
  { sec: '5D', titre: 'Fermeture du p\u00e9rim\u00e8tre', ancre: '5C \u2014 Plan de circulation', items: [
    ['clot2', 'Cl\u00f4ture rigide BTP H=2m', 'rc'], ['balis', 'Balisage tranch\u00e9e (K2 + lests)', 'rc'], ['portail', 'Portail cadenas / acc\u00e8s s\u00e9cu.', 'rc'],
    ['sigvoie', 'Signalisation voie publique', 'rc'], ['signoct', 'Signalisation nocturne', 'rc']] },
  { sec: '6A', titre: 'R\u00e9seaux enterr\u00e9s (DT / DICT)', ancre: '6A \u2014 R\u00e9seaux enterr\u00e9s', items: [
    ['aep', 'Eau (AEP) / Assainissement', 'dd'], ['gaz', 'Gaz', 'dd'], ['elecr', '\u00c9lectricit\u00e9 BT / HTA-HTB', 'dd'],
    ['telec', 'T\u00e9l\u00e9com / Fibre / \u00c9clairage public', 'dd'], ['sup', 'Investigations compl\u00e9mentaires (SUP) requises', 'sup']] },
  { sec: '6B', titre: 'R\u00e9seaux a\u00e9riens', ancre: '6B \u2014 R\u00e9seaux a\u00e9riens', items: [
    ['hta', 'Lignes HTA/HTB a\u00e9riennes', 'co'], ['bt', 'Lignes BT a\u00e9riennes', 'co'], ['fib', 'Fibres / t\u00e9l\u00e9com a\u00e9riens', 'co'],
    ['dist', 'Distances de s\u00e9curit\u00e9 / consignes exploitant', 'co']] },
  { sec: '6C', titre: 'Environnement proche', ancre: '6B \u2014 R\u00e9seaux a\u00e9riens', items: [
    ['voie', 'Voie publique / riverains', 'co'], ['erp', 'ERP / activit\u00e9 commerciale', 'co'], ['coursdeau', 'Cours d\u2019eau / zone inondable', 'co'],
    ['autre6', 'Autre :', 'coA']] },
  { sec: '8', titre: 'Risques sp\u00e9cifiques (CMR)', ancre: 'Silice / HAP', items: [
    ['amiante', 'Amiante', 'cmr'], ['plomb', 'Plomb', 'cmr'], ['silice', 'Silice / HAP / sols pollu\u00e9s', 'cmr'],
    ['bio', 'Risque biologique (site / \u00e9gouts)', 'cmr'], ['atex', 'ATEX (gaz / vapeurs)', 'cmr'], ['autre8', 'Autre :', 'cmrA']] },
  { sec: '9', titre: 'Permis et autorisations', ancre: 'Silice / HAP', items: [
    ['voirie', 'Arr\u00eat\u00e9 de voirie', 'perm'], ['dictc', 'DT/DICT compl\u00e8tes', 'perm'], ['feu', 'Permis feu', 'perm'],
    ['habil', 'Habilitation \u00e9lectrique', 'perm'], ['verif', 'V\u00e9rif. engins / levage', 'perm'], ['ss4', 'Rapport SS4 amiante', 'perm']] },
  { sec: '10', titre: 'EPI minimum obligatoires', ancre: 'Casque / Chaussures', items: [
    ['casque', 'Casque / Chaussures S3', 'co'], ['gilet', 'Gilet HV cl.2 / Gants', 'co'], ['lunettes', 'Lunettes / Prot. auditive', 'co'],
    ['respi', 'Prot. respiratoire (CMR)', 'co'], ['harnais', 'Harnais antichute (si protection collective impossible)', 'co']] },
];
// Section 11 du modele (vigilance meteo) : alimentee par le bloc meteo existant
var IC_METEO = [
  ['Eau fra\u00eeche en permanence', 'meteoEau'], ['Horaires adapt\u00e9s', 'meteoArret'], ['Zone ombre', 'meteoOmbre'],
  ['R\u00e9f\u00e9rent canicule', 'meteoReferent', 'nom'], ['Arr\u00eat imm\u00e9diat orage', 'meteoOrage'],
  ['Arr\u00eat hauteur / levage', 'meteoVent'], ['Report travaux ext\u00e9rieurs', 'meteoVerglas'], ['Suivi vigilance', 'meteoVigilance'],
  ['\u00c9quipements froid', 'meteoFroid'], ['R\u00e9f\u00e9rent intemp\u00e9ries', 'meteoReferentHiver', 'nom']];

var IC_TITRES_SEC = { '4': ['4', 'Informations pr\u00e9alables re\u00e7ues de l\u2019entreprise', '&#128196;'], '5': ['5', 'Organisation du site', '&#127959;'],
  '6': ['6', 'R\u00e9seaux et environnement', '&#9889;'], '8': ['8', 'Risques sp\u00e9cifiques (CMR)', '&#128296;'],
  '9': ['9', 'Permis et autorisations', '&#128220;'], '10': ['10', 'EPI minimum obligatoires', '&#9939;'] };

function icInput(id, ph, w) {
  return '<input type="text" id="' + id + '" placeholder="' + ph + '" style="flex:' + (w || 1) + ';min-width:0;padding:6px;border:1px solid var(--border);border-radius:5px;font-family:inherit;font-size:12px;">';
}
function icCase(id, lab) {
  return '<label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;"><input type="checkbox" id="' + id + '" style="width:18px;height:18px;">' + (lab || '') + '</label>';
}
function icLigneHtml(it) {
  var k = 'icg-' + it[0], lab = it[1], kind = it[2];
  var h = '<div style="padding:6px 0;border-bottom:1px solid var(--border);">';
  h += '<div style="font-size:13px;margin-bottom:4px;">' + (kind === 'coA' || kind === 'cmrA' ? icInput(k + '-lab', 'Autre (pr\u00e9ciser)', 1) : lab) + '</div>';
  h += '<div style="display:flex;gap:8px;align-items:center;">';
  if (kind === 'recu') h += icCase(k, 'Re\u00e7u');
  else if (kind === 'oc' || kind === 'co' || kind === 'coA') h += icCase(k, 'En place / vu') + icInput(k + '-t', 'Observations');
  else if (kind === 'vit') h += '<input type="number" id="' + k + '-v" placeholder="km/h" style="width:80px;padding:6px;border:1px solid var(--border);border-radius:5px;">' + icCase(k, 'Affich\u00e9e') + icInput(k + '-t', 'Observations');
  else if (kind === 'rc') h += icCase(k, 'En place') + icInput(k + '-t', 'Responsable');
  else if (kind === 'dd') h += icCase(k, 'DT re\u00e7ue') + icCase(k + '-2', 'DICT envoy\u00e9e') + icInput(k + '-t', 'Observations');
  else if (kind === 'sup') h += icCase(k, 'Requises') + icInput(k + '-t', 'Observations');
  else if (kind === 'cmr' || kind === 'cmrA') h += icCase(k, 'Pr\u00e9sent') + icInput(k + '-t', 'Mesures');
  else if (kind === 'perm') h += '<select id="' + k + '-s" style="padding:6px;border:1px solid var(--border);border-radius:5px;font-size:12px;"><option value="">Statut\u2026</option><option>Fourni</option><option>Requis</option><option>Sans objet</option></select>' + icInput(k + '-t', 'Observations');
  return h + '</div></div>';
}
function icGrilleSection(num) {
  var t = IC_TITRES_SEC[num];
  var h = sectionHeader(t[0], t[1], t[2]);
  IC_GRILLE.forEach(function (g) {
    if (g.sec.replace(/[A-D]$/, '') !== num) return;
    if (g.sec !== num) h += '<p style="font-size:12px;font-weight:600;color:var(--blue-dark);margin:10px 0 2px;">' + g.sec + ' \u2014 ' + g.titre + '</p>';
    g.items.forEach(function (it) { h += icLigneHtml(it); });
  });
  return h + sectionEnd();
}
function icCollecterGrille() {
  var r = {};
  IC_GRILLE.forEach(function (g) {
    g.items.forEach(function (it) {
      var k = 'icg-' + it[0];
      r[it[0]] = { c: getCheck(k), c2: getCheck(k + '-2'), t: getVal(k + '-t'), s: getVal(k + '-s'), v: getVal(k + '-v'), lab: getVal(k + '-lab') };
    });
  });
  return r;
}

// 7D : risques propres a l'entreprise (R.4532-66 2°)
var IC_ORIGINES = ['Mode op\u00e9ratoire', 'Mat\u00e9riels / installations', 'Produits', 'D\u00e9placements', 'Organisation du chantier'];
var icRpCount = 0;
function icNormTxt(x) { // = _normTxt d'Harmo
  return String(x || '').toLowerCase().replace(/\u0153/g, 'oe').replace(/\u0152/g, 'oe').replace(/\u00e6/g, 'ae').replace(/\u00c6/g, 'ae')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
}
function icMetiersDuLot(lot) { // = detecterMetiersMultiples d'Harmo
  var t = icNormTxt(lot); if (!t) return [];
  return Object.keys(IC_METIER_MOTS).filter(function (k) {
    return IC_METIER_MOTS[k].some(function (mot) { return t.indexOf(icNormTxt(mot)) >= 0; });
  });
}
function icTexteHarmo(t) { return String(t || '').replace(/ -- /g, ' \u2013 '); }
function ic7dHtml() {
  return sectionHeader('7D', 'Risques propres \u00e0 l\u2019entreprise (travaux confi\u00e9s)', '&#128736;')
    + '<p style="font-size:12px;color:var(--text-light);margin-bottom:8px;">R.4532-66 : risques li\u00e9s aux modes op\u00e9ratoires, mat\u00e9riels, produits, d\u00e9placements, organisation. '
    + 'Propositions : fiches-risques du m\u00e9tier (PGC Harmo), \u00e0 confirmer une par une. La mesure est celle annonc\u00e9e par l\u2019entreprise ; sans mesure, le Word indique \u00ab \u00e0 pr\u00e9ciser dans le PPSPS \u00bb.</p>'
    + '<div id="ic7d-liste"></div>'
    + '<button type="button" class="btn btn-outline btn-sm" onclick="ic7dAjouter(\'\', true, false)">+ Ajouter un risque propre</button> '
    + '<button type="button" class="btn btn-outline btn-sm" onclick="ic7dProposer(true)">&#128260; Proposer les risques du lot</button>'
    + sectionEnd();
}
function ic7dAjouter(label, coche, proposition, g, rappel) {
  var liste = document.getElementById('ic7d-liste'); if (!liste) return;
  icRpCount++;
  var d = document.createElement('div');
  d.className = 'ic7d-row'; if (proposition) d.setAttribute('data-prop', '1');
  d.style.cssText = 'padding:6px 0;border-bottom:1px solid var(--border);' + (proposition ? 'background:#f8fafc;' : '');
  d.innerHTML = '<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;">'
    + '<input type="checkbox" class="ic7d-ok" title="Confirm\u00e9 avec l\u2019entreprise"' + (coche ? ' checked' : '') + ' style="width:18px;height:18px;">'
    + '<textarea class="ic7d-lab" rows="' + Math.max(2, Math.min(6, Math.ceil(String(label || '').length / 28))) + '" placeholder="Risque propre" style="flex:1;min-width:0;padding:6px;border:1px solid var(--border);border-radius:5px;font-size:13px;font-family:inherit;resize:vertical;">' + icEscAttr(label) + '</textarea>'
    + (proposition ? '<span style="font-size:9px;font-weight:700;padding:0 4px;border-radius:3px;white-space:nowrap;background:' + (g >= 4 ? '#fee2e2;color:#b91c1c' : 'var(--bg-accent);color:var(--blue-mid)') + ';">' + (g ? 'G' + g + ' \u2014 ' : '') + '\u00e0 confirmer</span>' : '')
    + '<button type="button" class="btn-remove-ent" onclick="this.closest(\'.ic7d-row\').remove()">x</button></div>'
    + '<div style="display:flex;gap:6px;"><select class="ic7d-orig" style="padding:6px;border:1px solid var(--border);border-radius:5px;font-size:12px;"><option value="">Origine\u2026</option>'
    + IC_ORIGINES.map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select>'
    + '<input type="text" class="ic7d-mes" placeholder="Mesure annonc\u00e9e par l\u2019entreprise" style="flex:1;padding:6px;border:1px solid var(--border);border-radius:5px;font-size:12px;"></div>'
    + (rappel ? '<div style="font-size:11px;color:var(--text-light);margin-top:3px;"><strong>Rappel PGC :</strong> ' + icEscAttr(rappel) + '</div>' : '');
  liste.appendChild(d);
}
function ic7dProposer(depuisBouton) {
  var liste = document.getElementById('ic7d-liste'); if (!liste) return;
  Array.prototype.slice.call(liste.querySelectorAll('.ic7d-row[data-prop="1"]')).forEach(function (r) {
    if (!r.querySelector('.ic7d-ok').checked) r.remove();
  });
  var deja = Array.prototype.slice.call(liste.querySelectorAll('.ic7d-lab')).map(function (i) { return i.value; });
  var lot = getVal('fic-ent-lot');
  var n = 0, fiches = [];
  icMetiersDuLot(lot).forEach(function (k) {
    (IC_METIERS_RISQUES[k].risques || []).forEach(function (r) { fiches.push(r); });
  });
  fiches.sort(function (x, y) { return (y.g || 0) - (x.g || 0); });
  fiches.forEach(function (r) {
    var lib = icTexteHarmo(r.sit) + ' : ' + icTexteHarmo(r.risk);
    if (deja.indexOf(lib) !== -1) return;
    deja.push(lib);
    ic7dAjouter(lib, false, true, r.g, icTexteHarmo(r.mes)); n++;
  });
  var noms = icMetiersDuLot(lot).map(function (k) { return icTexteHarmo(IC_METIERS_RISQUES[k].label); });
  if (depuisBouton) showToast(n ? n + ' fiche(s) propos\u00e9e(s) en 7D (' + noms.join(', ') + ') \u2014 \u00e0 confirmer' : 'Aucun m\u00e9tier reconnu pour ce lot : ajoutez les risques \u00e0 la main', n ? 'success' : 'error');
}
function ic7dCollecter() {
  return Array.prototype.slice.call(document.querySelectorAll('#ic7d-liste .ic7d-row')).filter(function (r) {
    return r.querySelector('.ic7d-ok').checked && r.querySelector('.ic7d-lab').value.trim();
  }).map(function (r) {
    return { label: r.querySelector('.ic7d-lab').value.trim(), origine: r.querySelector('.ic7d-orig').value, mesure: r.querySelector('.ic7d-mes').value.trim() };
  });
}

// Emargement, points PPSPS, diffusion, formalites (Cat. 3)
var icPresCount = 0;
var IC_FORMALITES = ['PPSPS simplifi\u00e9', 'Habilitations \u00e9lectriques', 'Autorisations de conduite', 'Attestations de formation au travail en hauteur', 'Fiches de Donn\u00e9es de S\u00e9curit\u00e9'];
function icFinHtml() {
  var h = sectionHeader('14 bis', 'Personnes pr\u00e9sentes (\u00e9margement)', '&#9997;');
  h += '<div id="ic-pres-liste"></div>';
  h += '<button type="button" class="btn btn-outline btn-sm" onclick="icPresAjouter(\'\', \'\', \'autre\')">+ Ajouter une personne</button>';
  h += sectionEnd();
  h += sectionHeader('15', 'PPSPS et diffusion', '&#128228;');
  h += fieldRow('Autres points \u00e0 reporter dans le PPSPS (les risques 7D y sont repris automatiquement)', 'ic-points-ppsps', 'textarea', '', '');
  if (terrainAffaire && terrainAffaire.cat === 3) {
    h += '<p style="font-size:12px;font-weight:600;margin:8px 0 4px;">Formalit\u00e9s exig\u00e9es avant d\u00e9marrage</p>';
    IC_FORMALITES.forEach(function (f, i) { h += checkRow(f, 'ic-form-' + i, false); });
  }
  h += '<p style="font-size:12px;font-weight:600;margin:8px 0 4px;">Diffusion de la fiche</p>';
  [['moa', 'Ma\u00eetre d\u2019ouvrage'], ['moe', 'Ma\u00eetre d\u2019\u0153uvre'], ['ent', 'Entreprise'], ['rjc', 'Registre-journal de la coordination']].forEach(function (x) {
    h += checkRow(x[1], 'ic-diff-' + x[0], true);
  });
  return h + sectionEnd();
}
function icPresAjouter(nom, qualite, role) {
  var liste = document.getElementById('ic-pres-liste'); if (!liste) return;
  icPresCount++;
  var n = icPresCount;
  var d = document.createElement('div');
  d.className = 'ic-pres'; d.setAttribute('data-role', role); d.setAttribute('data-n', n);
  d.style.cssText = 'padding:6px 0;border-bottom:1px solid var(--border);';
  d.innerHTML = '<div style="display:flex;gap:6px;">'
    + '<input type="text" class="ic-pres-nom" value="' + icEscAttr(nom) + '" placeholder="Nom / Pr\u00e9nom" style="flex:1;padding:6px;border:1px solid var(--border);border-radius:5px;font-size:13px;">'
    + '<input type="text" class="ic-pres-qual" value="' + icEscAttr(qualite) + '" placeholder="Entreprise / Qualit\u00e9" style="flex:1;padding:6px;border:1px solid var(--border);border-radius:5px;font-size:13px;">'
    + (role === 'autre' ? '<button type="button" class="btn-remove-ent" onclick="this.closest(\'.ic-pres\').remove()">x</button>' : '') + '</div>'
    + (role === 'autre'
      ? '<canvas id="ic-pres-sig-' + n + '" height="90" style="border:1px solid var(--border);border-radius:6px;width:100%;touch-action:none;background:white;margin-top:4px;"></canvas>'
        + '<button type="button" class="btn btn-outline btn-sm" onclick="clearSig(\'ic-pres-sig-' + n + '\', \'pres_' + n + '\', \'\')">&#10005; Effacer</button>'
      : '<div style="font-size:11px;color:var(--text-light);margin-top:2px;">Signature reprise du visa (' + (role === 'csps' ? 'coordonnateur' : 'repr\u00e9sentant de l\u2019entreprise') + ').</div>');
  liste.appendChild(d);
  if (role === 'autre') initSigCanvas('ic-pres-sig-' + n, 'pres_' + n);
}
function icCollecterPresents() {
  return Array.prototype.slice.call(document.querySelectorAll('#ic-pres-liste .ic-pres')).map(function (d) {
    var role = d.getAttribute('data-role');
    var sig = role === 'csps' ? sigData.csps : role === 'ent' ? sigData.ent : sigData['pres_' + d.getAttribute('data-n')];
    return { nom: d.querySelector('.ic-pres-nom').value.trim(), qualite: d.querySelector('.ic-pres-qual').value.trim(), role: role, sig: sig || null };
  }).filter(function (p) { return p.nom || p.qualite; });
}

function icInitFormulaire() {
  icPresCount = 0; icRpCount = 0;
  var liste = document.getElementById('ic-pres-liste');
  if (liste && !liste.children.length) {
    icPresAjouter('Alain SUZANNE', 'CSPS17 \u2014 Coordonnateur SPS', 'csps');
    icPresAjouter('', '', 'ent');
  }
  var ent = terrainAffaire && terrainAffaire._entCourante;
  if (ent) {
    var idx = icEntreprises().indexOf(ent);
    var sel = document.querySelector('select[onchange^="terrainRemplirEntreprise"]');
    if (sel && idx >= 0) sel.value = String(idx);
    icApresChoixEntreprise(ent);
  }
}

function icSet(id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; }
function icApresChoixEntreprise(ent) {
  if (!ent) return;
  terrainAffaire._entCourante = ent;
  icSet('fic-ent-nom', ent.nom); icSet('fic-ent-contact', ent.contact); icSet('fic-ent-tel', ent.tel);
  icSet('fic-ent-tel-fixe', ent.telFixe); icSet('fic-ent-lot', ent.lot); icSet('fic-ent-effectif', ent.effectif);
  icSet('t-ent-nom-sig', ent.contact); icSet('t-ent-qualite-sig', ent.nom);
  // Sous-traitants et prestataires rattaches
  var sts = icEnfants(ent, 'sous-traitant'), prests = icEnfants(ent, 'prestataire');
  var liste = document.getElementById('fic-st-liste');
  if (liste) liste.innerHTML = '';
  var oui = document.getElementById('fic-st-oui'), non = document.getElementById('fic-st-non');
  if (sts.length && oui) {
    oui.checked = true; toggleSousTraitance();
    if (liste) liste.innerHTML = '';
    sts.forEach(function (s) {
      addSousTraitant();
      var r = liste.lastElementChild;
      r.querySelector('.st-ent-nom').value = s.nom || ''; r.querySelector('.st-ent-lot').value = s.lot || '';
    });
  } else if (non) { non.checked = true; toggleSousTraitance(); }
  icSet('ic-prestataires', prests.map(function (p) { return p.nom + (p.lot ? ' (' + p.lot + ')' : ''); }).join(' ; '));
  var box = document.getElementById('ic-st-de');
  var donneur = ent.type === 'sous-traitant' ? icEntParId(ent.parent) : null;
  if (box) {
    if (ent.type === 'sous-traitant') {
      box.style.display = 'block';
      box.innerHTML = 'Entreprise sous-traitante de <strong>' + icEscAttr(donneur ? donneur.nom : '(donneur d\u2019ordre \u00e0 rattacher dans Intervenants)') + '</strong>'
        + '<label style="display:flex;gap:8px;align-items:center;margin-top:6px;"><input type="checkbox" id="ic-do-present" style="width:18px;height:18px;"> Donneur d\u2019ordre pr\u00e9sent \u00e0 l\u2019IC</label>';
    } else { box.style.display = 'none'; box.innerHTML = ''; }
  }
  // Representant : ligne d'emargement
  var rep = document.querySelector('#ic-pres-liste .ic-pres[data-role="ent"]');
  if (rep) { rep.querySelector('.ic-pres-nom').value = ent.contact || ''; rep.querySelector('.ic-pres-qual').value = ent.nom || ''; }
  ic7dProposer(false);
}

// Point 13 : compagnon sans delegation -> pas d'IC, notification du report
function icControleDelegation() {
  if (getVal('ic-rep-qualite') !== 'Compagnon' || getCheck('ic-rep-deleg')) return true;
  var nomEnt = getVal('fic-ent-nom') || 'l\u2019entreprise';
  openDocModal('Inspection commune non r\u00e9alis\u00e9e',
    '<p style="font-size:14px;line-height:1.5;">Le repr\u00e9sentant est un compagnon dont la d\u00e9l\u00e9gation n\u2019est pas confirm\u00e9e. '
    + 'Guide CARSAT / OPPBTP : en cas de doute r\u00e9el sur la comp\u00e9tence et la d\u00e9l\u00e9gation, ne pas faire l\u2019IC et en notifier le motif \u00e0 l\u2019entreprise.</p>'
    + '<p style="font-size:13px;margin-top:8px;">Si la d\u00e9l\u00e9gation est confirm\u00e9e, cochez la case sous \u00ab Qualit\u00e9 du repr\u00e9sentant \u00bb puis g\u00e9n\u00e9rez la fiche.</p>',
    'R\u00e9diger la notification de report', function () {
      ouvrirFormulaireDoc('OBS');
      var sel = document.getElementById('ic-nature');
      if (sel) { sel.value = 'Notification'; try { toggleChampsObservationIC(); } catch (e) {} }
      icSet('ic-dest-raison', nomEnt);
      icSet('ic-objet', 'Report de l\u2019inspection commune pr\u00e9alable');
      icSet('ic-corps', 'L\u2019inspection commune pr\u00e9alable pr\u00e9vue ce jour n\u2019a pas pu \u00eatre r\u00e9alis\u00e9e : la personne pr\u00e9sente n\u2019avait pas de d\u00e9l\u00e9gation confirm\u00e9e pour repr\u00e9senter l\u2019entreprise. '
        + 'Merci de convenir d\u2019une nouvelle date avec le coordonnateur en pr\u00e9sence d\u2019un repr\u00e9sentant habilit\u00e9 (dirigeant, conducteur de travaux ou chef de chantier). '
        + 'Aucune intervention sur le chantier avant la r\u00e9alisation de cette inspection commune (R.4532-13).');
    });
  return false;
}

// Complete terrainAffaire._ficData avec tout ce qui manquait
function icCompleterFicData(d) {
  var ent = terrainAffaire._entCourante || {};
  var pgc = getVal('fic-pgc');
  d.pgcStatut = /transmis/i.test(pgc) ? 'transmis' : /mise (a|\u00e0) jour/i.test(pgc) ? 'maj' : 'remis';
  d.entPeriode = [getVal('fic-ent-periode'), getVal('fic-ent-effectif') ? getVal('fic-ent-effectif') + ' pers.' : ''].filter(Boolean).join(' \u2014 ');
  d.pgcDate = getVal('fic-pgc-date'); d.pgcVersion = getVal('fic-pgc-version');
  d.entTelMailSiret = [getVal('fic-ent-tel') || ent.tel, ent.mail, ent.siret ? 'SIRET ' + ent.siret : ''].filter(Boolean).join(' | ');
  d.repQualite = getVal('ic-rep-qualite'); d.repDelegation = getCheck('ic-rep-deleg');
  d.entType = ent.type || '';
  var donneur = ent.type === 'sous-traitant' ? icEntParId(ent.parent) : null;
  d.donneurOrdre = donneur ? donneur.nom : ''; d.donneurPresent = getCheck('ic-do-present');
  d.prestataires = getVal('ic-prestataires');
  d.grille = icCollecterGrille();
  d.risquesPropres = ic7dCollecter();
  d.presents = icCollecterPresents();
  d.pointsPPSPS = getVal('ic-points-ppsps');
  d.diffusion = { moa: getCheck('ic-diff-moa'), moe: getCheck('ic-diff-moe'), ent: getCheck('ic-diff-ent'), rjc: getCheck('ic-diff-rjc') };
  d.formalites = IC_FORMALITES.map(function (f, i) { return getCheck('ic-form-' + i); });
  if (!terrainAffaire._icFaites) terrainAffaire._icFaites = [];
  terrainAffaire._icFaites.push(ent.id || ent.nom || '');
}

// Point 12 : IC groupee par lot — une fiche par entreprise, constats communs conserves
function icRacine(e) {
  var vus = {};
  while (e && e.parent && !vus[e.parent]) { vus[e.parent] = true; var p = icEntParId(e.parent); if (!p) break; e = p; }
  return e;
}
function icProposerSuivante() {
  var ent = terrainAffaire && terrainAffaire._entCourante; if (!ent) return;
  var racine = icRacine(ent), lotN = normaliserTexte(ent.lot || '');
  var faites = terrainAffaire._icFaites || [];
  var cand = [];
  icEntreprises().forEach(function (e, i) {
    if (e === ent || e.type === 'prestataire') return;
    if (faites.indexOf(e.id || e.nom || '') !== -1) return;
    var memeGroupe = (racine && icRacine(e) === racine) || (lotN && normaliserTexte(e.lot || '') === lotN);
    if (memeGroupe) cand.push([e, i]);
  });
  if (!cand.length) return;
  var h = '<p style="font-size:14px;margin-bottom:8px;">IC group\u00e9e : fiche suivante pour une autre entreprise du m\u00eame lot. '
    + 'Les constats communs (site, r\u00e9seaux, CMR, permis, EPI, m\u00e9t\u00e9o, secours, \u00e9margement) sont conserv\u00e9s ; '
    + 'l\u2019entreprise, ses risques propres (7D) et sa signature sont \u00e0 refaire.</p>';
  cand.forEach(function (c) {
    h += '<button type="button" class="btn btn-outline" style="width:100%;margin-bottom:6px;text-align:left;" onclick="closeModal();icPasserA(' + c[1] + ')">'
      + icEscAttr(icLibelleEntreprise(c[0], c[1])) + '</button>';
  });
  setTimeout(function () { openDocModal('Fiche suivante du m\u00eame lot ?', h, null, null); }, 600);
}
function icPasserA(idx) {
  var sel = document.querySelector('select[onchange^="terrainRemplirEntreprise"]');
  if (sel) sel.value = String(idx);
  var liste = document.getElementById('ic7d-liste'); if (liste) liste.innerHTML = '';
  icSet('ic-rep-qualite', ''); var dl = document.getElementById('ic-rep-deleg'); if (dl) dl.checked = false;
  var dw = document.getElementById('ic-deleg-wrap'); if (dw) dw.style.display = 'none';
  terrainRemplirEntreprise(String(idx));
  clearSig('sig-canvas-ent', 'ent', 'sig-status-ent');
  var s2 = document.getElementById('fic-ent-nom'); if (s2) s2.scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast('Constats communs conserv\u00e9s \u2014 v\u00e9rifiez l\u2019entreprise, sa section 7D et faites signer', 'success');
}

// ---------- 3. Injection dans le Word ----------
var IC_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function icTxt(el) { var s = '', ts = el.getElementsByTagNameNS(IC_W, 't'); for (var i = 0; i < ts.length; i++) s += ts[i].textContent; return s; }
function icEnfantsW(el, nom) { var r = []; for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && n.localName === nom && n.namespaceURI === IC_W) r.push(n); return r; }
function icTables(doc) { return icEnfantsW(doc.getElementsByTagNameNS(IC_W, 'body')[0], 'tbl'); }
function icTable(doc, ancre) { var t = icTables(doc).filter(function (t) { return icTxt(t).indexOf(ancre) !== -1; }); return t[0] || null; }
function icCellText(doc, tc, s) {
  var ps = icEnfantsW(tc, 'p');
  var p = ps[0];
  if (!p) { p = doc.createElementNS(IC_W, 'w:p'); tc.appendChild(p); }
  for (var i = 1; i < ps.length; i++) tc.removeChild(ps[i]);
  icEnfantsW(p, 'r').forEach(function (r) { p.removeChild(r); });
  var lignes = String(s == null ? '' : s).split('\n');
  var r = doc.createElementNS(IC_W, 'w:r');
  var rPr = doc.createElementNS(IC_W, 'w:rPr');
  var f = doc.createElementNS(IC_W, 'w:rFonts'); f.setAttributeNS(IC_W, 'w:ascii', 'Arial'); f.setAttributeNS(IC_W, 'w:hAnsi', 'Arial'); f.setAttributeNS(IC_W, 'w:cs', 'Arial');
  var sz = doc.createElementNS(IC_W, 'w:sz'); sz.setAttributeNS(IC_W, 'w:val', '16');
  var szc = doc.createElementNS(IC_W, 'w:szCs'); szc.setAttributeNS(IC_W, 'w:val', '16');
  rPr.appendChild(f); rPr.appendChild(sz); rPr.appendChild(szc); r.appendChild(rPr);
  lignes.forEach(function (l, k) {
    if (k) r.appendChild(doc.createElementNS(IC_W, 'w:br'));
    var t = doc.createElementNS(IC_W, 'w:t'); t.setAttribute('xml:space', 'preserve'); t.textContent = l; r.appendChild(t);
  });
  p.appendChild(r);
}
// Cellules suivant le libelle `label` dans la table `tbl`
function icLigne(doc, tbl, label, valeurs) {
  if (!tbl) return false;
  var trs = icEnfantsW(tbl, 'tr');
  for (var i = 0; i < trs.length; i++) {
    var tcs = icEnfantsW(trs[i], 'tc');
    for (var j = 0; j < tcs.length; j++) {
      if (icNorm(icTxt(tcs[j])).indexOf(icNorm(label)) === 0) {
        for (var k = 0; k < valeurs.length; k++) {
          if (valeurs[k] === null || valeurs[k] === undefined || !tcs[j + 1 + k]) continue;
          icCellText(doc, tcs[j + 1 + k], valeurs[k]);
        }
        return tcs[j];
      }
    }
  }
  return false;
}
// Remplace les lignes de donnees (a partir de `debut`) par une ligne par element
function icRemplirLignes(doc, tbl, debut, lignes) {
  if (!tbl) return;
  var trs = icEnfantsW(tbl, 'tr');
  var modele = trs[debut];
  if (!modele) return;
  for (var i = debut; i < trs.length; i++) tbl.removeChild(trs[i]);
  lignes.forEach(function (vals) {
    var tr = modele.cloneNode(true);
    icEnfantsW(tr, 'tc').forEach(function (tc, k) { icCellText(doc, tc, vals[k] || ''); });
    tbl.appendChild(tr);
  });
}
function icNorm(s) { return String(s || '').replace(/[\u2019']/g, "'").replace(/\s+/g, ' ').trim(); }
function icCoche(b) { return b ? '\u2713' : '\u2014'; }
function icParagraphes(doc) { return doc.getElementsByTagNameNS(IC_W, 't'); }
function icRemplacerT(doc, contient, fn) {
  var ts = icParagraphes(doc);
  for (var i = 0; i < ts.length; i++) if (ts[i].textContent.indexOf(contient) !== -1) { ts[i].textContent = fn(ts[i].textContent, ts[i]); return ts[i]; }
  return null;
}

function injecterICComplete(zip, d, isCat3) {
  if (!d) return zip;
  var f = zip.file('word/document.xml'); if (!f) return zip;
  var doc = new DOMParser().parseFromString(f.asText(), 'application/xml');
  var sigs = [];

  // Entreprise : representant, sous-traitance, prestataires
  var tEE = icTable(doc, 'Représentant / CDT');
  if (tEE) {
    icLigne(doc, tEE, 'Raison sociale', [d.entNom || '']);
    icLigne(doc, tEE, 'Compagnon référent', [d.entCompagnon || '']);
    icLigne(doc, tEE, 'Travaux confiés', [d.entLot || '']);
    icLigne(doc, tEE, 'Période / Effectif max.', [d.entPeriode || '']);
    var rep = [d.entContact, d.repQualite ? d.repQualite.toLowerCase() : '', (d.repQualite === 'Compagnon' && d.repDelegation) ? 'd\u00e9l\u00e9gation confirm\u00e9e' : ''].filter(Boolean).join(' \u2014 ');
    if (rep) icLigne(doc, tEE, 'Représentant / CDT', [rep]);
    if (d.entTelMailSiret) icLigne(doc, tEE, 'Tél / Mail / SIRET', [d.entTelMailSiret]);
    var st;
    if (d.entType === 'sous-traitant') st = 'Entreprise sous-traitante de ' + (d.donneurOrdre || '(non renseign\u00e9)') + ' \u2014 donneur d\u2019ordre pr\u00e9sent \u00e0 l\u2019IC : ' + (d.donneurPresent ? 'oui' : 'non');
    else st = (d.stOui && d.stEntreprises && d.stEntreprises.length)
      ? d.stEntreprises.map(function (e) { return e.nom + (e.lot ? ' (' + e.lot + ')' : ''); }).join(' ; ') : 'Aucun sous-traitant d\u00e9clar\u00e9';
    icLigne(doc, tEE, 'Sous-traitants', [st]);
  }
  icRemplacerT(doc, 'Prestataires : ___', function (s) { return s.replace(/_{3,}/, d.prestataires || 'aucun d\u00e9clar\u00e9'); });

  if (!isCat3) {
    // Date de l'IC / fin previsionnelle / effectif (ligne sous les intitules)
    var tDat = icTable(doc, 'Nb. intervenants prévu');
    if (tDat) {
      var trD = icEnfantsW(tDat, 'tr')[1];
      if (trD) {
        var tcD = icEnfantsW(trD, 'tc'), vD = [d.dateIC ? formatDateFR(d.dateIC) : '', d.dateFin || '', d.effectif ? d.effectif + ' pers.' : ''];
        tcD.forEach(function (tc, k) { icCellText(doc, tc, vD[k] || ''); });
      }
    }
    // PGC remis
    icRemplacerT(doc, 'Remis ce jour (lors de l', function () {
      return (d.pgcStatut === 'remis' ? '\u2611' : '\u2610') + ' Remis ce jour (lors de l\u2019ICP)   '
        + (d.pgcStatut === 'transmis' ? '\u2611' : '\u2610') + ' D\u00e9j\u00e0 transmis le : ' + (d.pgcDate ? formatDateFR(d.pgcDate) : '___________') + '   '
        + (d.pgcStatut === 'maj' ? '\u2611' : '\u2610') + ' Version mise \u00e0 jour n\u00b0 ' + (d.pgcVersion || '____');
    });
    // Grille 4, 5, 6, 8, 9, 10
    var g = d.grille || {};
    IC_GRILLE.forEach(function (sec) {
      var tbl = icTable(doc, sec.ancre);
      sec.items.forEach(function (it) {
        var v = g[it[0]] || {}, kind = it[2], lab = it[1];
        if (kind === 'recu') icLigne(doc, tbl, lab, [v.c ? '\u2713 re\u00e7u' : 'non re\u00e7u']);
        else if (kind === 'oc') icLigne(doc, tbl, lab, [v.t, icCoche(v.c)]);
        else if (kind === 'vit') {
          var cell = icLigne(doc, tbl, 'Vitesse limitée', [v.t, icCoche(v.c)]);
          if (cell) icCellText(doc, cell, 'Vitesse limit\u00e9e : ' + (v.v || '______') + ' km/h');
        }
        else if (kind === 'rc') icLigne(doc, tbl, lab, [v.t, icCoche(v.c)]);
        else if (kind === 'dd') icLigne(doc, tbl, lab, [icCoche(v.c), icCoche(v.c2), v.t]);
        else if (kind === 'sup') icLigne(doc, tbl, lab, [v.c ? 'Oui' : 'Non', '', v.t]);
        else if (kind === 'co') icLigne(doc, tbl, lab, [icCoche(v.c), v.t]);
        else if (kind === 'coA') {
          var c6 = icLigne(doc, tbl, 'Autre :', v.lab ? [icCoche(v.c), v.t] : []);
          if (c6 && v.lab) icCellText(doc, c6, 'Autre : ' + v.lab);
        }
        else if (kind === 'cmr') icLigne(doc, tbl, lab, [v.c ? 'Oui' : 'Non', v.t]);
        else if (kind === 'cmrA') {
          var c8 = icLigne(doc, tbl, 'Autre :', v.lab ? [v.c ? 'Oui' : 'Non', v.t] : []);
          if (c8 && v.lab) icCellText(doc, c8, 'Autre : ' + v.lab);
        }
        else if (kind === 'perm') icLigne(doc, tbl, lab, [v.t, v.s || '\u2014']);
      });
    });
    // 11 : vigilance meteo
    var t11 = icTable(doc, 'Mesure météo');
    IC_METEO.forEach(function (m) {
      var val = d[m[1]];
      if (m[2] === 'nom') icLigne(doc, t11, m[0], [val ? '\u2713' : '\u2014', val || '']);
      else icLigne(doc, t11, m[0], [icCoche(val), '']);
    });
    // 7A / 7B / 7C : risques coches, mesures verifiees (PGC_RISQUES_LIB)
    var l7 = { a: [], b: [], c: [] };
    (d.risquesIC || []).forEach(function (r) {
      var def = (typeof IC_RISQUES_DEF !== 'undefined' && IC_RISQUES_DEF[r.id]) || {};
      var lib = PGC_RISQUES_LIB[r.id] || {};
      var mes = def.mesures ? def.mesures.join('\n') : (lib.mesures || '');
      var ligne = [lib.label || def.label || r.id, mes, r.obs || ''];
      if (r.imp) l7.b.push(ligne);
      if (r.ex) l7.c.push(ligne);
      if (r.id === 'r24' || (!r.imp && !r.ex)) l7.a.push(ligne);
    });
    var vide = ['Aucun risque relev\u00e9 lors de l\u2019IC', '', ''];
    icRemplirLignes(doc, icTable(doc, '7A — Co-activité'), 2, l7.a.length ? l7.a : [vide]);
    icRemplirLignes(doc, icTable(doc, '7B — Risques importés'), 2, l7.b.length ? l7.b : [vide]);
    icRemplirLignes(doc, icTable(doc, '7C — Risques exportés'), 2, l7.c.length ? l7.c : [vide]);
  } else {
    // Cat. 3 : formalites exigees
    var tF = icTable(doc, 'Document exigé');
    if (tF) {
      var trsF = icEnfantsW(tF, 'tr');
      for (var fi = 1; fi < trsF.length && fi <= 5; fi++) {
        var tcsF = icEnfantsW(trsF[fi], 'tc');
        if (tcsF[1]) icCellText(doc, tcsF[1], (d.formalites || [])[fi - 1] ? '\u2611 Requis' : '\u2610 Non requis');
      }
    }
  }

  // 7D : risques propres
  var rp = (d.risquesPropres || []).map(function (r) {
    return [r.label + (r.origine ? ' (' + r.origine.toLowerCase() + ')' : ''), r.mesure || '\u00c0 pr\u00e9ciser dans le PPSPS', '\u2713'];
  });
  var t7d = icTable(doc, 'Risque propre (origine)');
  if (t7d) {
    var debut7d = icEnfantsW(t7d, 'tr').length === 2 ? 1 : 2;
    icRemplirLignes(doc, t7d, debut7d, rp.length ? rp : [['Aucun risque propre relev\u00e9 lors de l\u2019IC', '', '']]);
  }
  // Points a reporter dans le PPSPS
  var pts = (d.risquesPropres || []).map(function (r) { return r.label + (r.mesure ? ' : ' + r.mesure : ''); });
  if (d.pointsPPSPS) pts.push(d.pointsPPSPS);
  var tPts = icRemplacerT(doc, 'Points à reporter dans le PPSPS', function (s) { return s; });
  if (tPts) {
    var ts = icParagraphes(doc);
    for (var ti = 0; ti < ts.length; ti++) {
      if (ts[ti] === tPts) {
        for (var tj = ti + 1; tj < Math.min(ti + 4, ts.length); tj++) {
          if (/^_{5,}$/.test(ts[tj].textContent.trim())) { ts[tj].textContent = pts.length ? pts.join(' ; ') : 'N\u00e9ant'; break; }
        }
        break;
      }
    }
  }
  // Diffusion
  var diff = d.diffusion || {};
  icRemplacerT(doc, 'Registre-journal de la coordination (R.4532-38)', function () {
    return (diff.moa ? '\u2611' : '\u2610') + ' Ma\u00eetre d\u2019ouvrage   ' + (diff.moe ? '\u2611' : '\u2610') + ' Ma\u00eetre d\u2019\u0153uvre   '
      + (diff.ent ? '\u2611' : '\u2610') + ' Entreprise   ' + (diff.rjc ? '\u2611' : '\u2610') + ' Registre-journal de la coordination (R.4532-38)';
  });
  // Emargement
  var tEm = icTable(doc, 'Entreprise / Qualité');
  if (tEm && d.presents && d.presents.length) {
    var lignesEm = d.presents.map(function (p, i) {
      if (p.sig) sigs.push(p.sig);
      return [p.nom, p.qualite, p.sig ? '\u00a7SIG' + (sigs.length - 1) + '\u00a7' : ''];
    });
    icRemplirLignes(doc, tEm, 1, lignesEm);
  }

  var xml = new XMLSerializer().serializeToString(doc);
  if (xml.indexOf('<?xml') !== 0) xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xml;
  // Signatures de l'emargement (images)
  if (sigs.length) {
    var rels = zip.file('word/_rels/document.xml.rels').asText();
    var ct = zip.file('[Content_Types].xml').asText();
    if (ct.indexOf('Extension="png"') === -1) ct = ct.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>');
    sigs.forEach(function (s, i) {
      var rid = 400 + i;
      var b = atob(s.split(',')[1]), arr = new Uint8Array(b.length);
      for (var k = 0; k < b.length; k++) arr[k] = b.charCodeAt(k);
      zip.file('word/media/emarg' + rid + '.png', arr);
      rels = rels.replace('</Relationships>', '<Relationship Id="rId' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/emarg' + rid + '.png"/></Relationships>');
      var img = '<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">'
        + '<wp:extent cx="1300000" cy="360000"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="' + rid + '" name="emarg' + rid + '"/>'
        + '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        + '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + rid + '" name="emarg' + rid + '"/><pic:cNvPicPr/></pic:nvPicPr>'
        + '<pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        + '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1300000" cy="360000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
        + '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
      xml = xml.replace(new RegExp('<w:r\\b[^>]*>(?:(?!<w:r[ >])[\\s\\S])*?\u00a7SIG' + i + '\u00a7[\\s\\S]*?</w:r>'), img);
    });
    zip.file('word/_rels/document.xml.rels', rels);
    zip.file('[Content_Types].xml', ct);
  }
  zip.file('word/document.xml', xml);
  return zip;
}
