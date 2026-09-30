# Construit complet/index.html a partir de l'ancien CSPS17 (debranche du serveur)
import re, sys, os
src = open(sys.argv[1], encoding='utf-8').read().replace('\r\n', '\n')
s = src
def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, (c, old[:80])
    s = s.replace(old, new)
# 1. bibliotheques Word locales + API locale
rep('<script src="https://cdn.jsdelivr.net/npm/pizzip@3.1.4/dist/pizzip.min.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/docxtemplater@3.44.0/build/docxtemplater.js"></script>',
    '<script src="lib/pizzip.js"></script>\n<script src="lib/docxtemplater.js"></script>\n<script src="local-api.js"></script>')
# 2. manifeste et icones (test dans le sous-dossier)
rep('<link rel="manifest" href="/manifest.json">\n', '')
rep('href="/icon-192.png"', 'href="../icon-192.png"')
# 3. Sami et veille retires
a = s.index('<!-- Base de connaissances CSPS de Sami'); b = s.index('<script src="/veille-csps.js"></script>') + len('<script src="/veille-csps.js"></script>')
s = s[:a] + s[b:]
a = s.index('<!-- ===================== ASSISTANT CSPS INT'); b = s.index('FIN ASSISTANT CSPS INT'); b = s.index('-->', b) + 3
s = s[:a] + s[b:]
# 4. modeles Word servis depuis le depot
rep("var url = 'https://raw.githubusercontent.com/coordo17/csps17/main/' + fname;", "var url = 'modeles/' + fname;")
assert 'raw.githubusercontent' not in s, 'autre acces aux modeles en ligne'
# 5. indicateur : plus de serveur
rep("local: { c:'#f59e0b', bg:'#fff3e0', t:'Local seulement' },", "local: { c:'#16a34a', bg:'#e8f5e9', t:'Dans cet appareil' },")
rep("ok:    { c:'#16a34a', bg:'#e8f5e9', t:'Enregistre' },", "ok:    { c:'#16a34a', bg:'#e8f5e9', t:'Dans cet appareil' },")
# 6. boutons d'import PGC par IA masques
rep('<button class="btn btn-outline btn-sm" id="btn-import-pgc" onclick="showPage(\'import\')">', '<button class="btn btn-outline btn-sm" id="btn-import-pgc" style="display:none" onclick="showPage(\'import\')">')
rep('<button class="btn btn-outline" onclick="showPage(\'import\')">&#128229; Importer un PGC</button>', '')
# 7. envoi d'un document : enregistrer puis Gmail
a = s.index('// Envoi reel vers /api/envoyer-doc'); b = s.index('function envoyerDocMoi(entryId)')
s = s[:a] + r'''// Envoi d'un document : sans serveur de mail, le fichier est enregistre dans
// Telechargements, puis joint a un mail Gmail (destinataires rappeles).
async function envoyerDocReel(affaire, e, supp) {
  supp = (supp || '').split(',').map(function(x){ return x.trim(); }).filter(Boolean).join(', ');
  try {
    var blob;
    if (e.fichierPath) { var r = await fetch('/api/rjc-file?path=' + encodeURIComponent(e.fichierPath)); if (!r.ok) throw new Error('fichier absent de cet appareil'); blob = await r.blob(); }
    else blob = dataUrlVersBlob(e.fichierData);
    enregistrerEtExpliquer(blob, e.fichierNom || e.ref || 'document.docx', supp);
    if (supp && affaire.rjc) { e.diffusion = (e.diffusion ? e.diffusion + ' ; ' : '') + new Date().toISOString().split('T')[0] + ' \u2192 ' + supp; persistAffaires(); }
  } catch (err) { showToast('Enregistrement impossible : ' + err.message, 'error'); }
}
function enregistrerEtExpliquer(blob, nom, destinataires) {
  var url = URL.createObjectURL(new Blob([blob], { type: 'application/octet-stream' })), a = document.createElement('a');
  a.href = url; a.download = nom; document.body.appendChild(a); a.click();
  setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); }, 4000);
  var android = /Android/i.test(navigator.userAgent);
  var html = '<div style="text-align:left;font-size:14px;line-height:1.5;"><p style="word-break:break-all;"><strong>' + escHtml(nom) + '</strong></p>'
    + (android ? '<p>Le fichier est dans <strong>T\u00e9l\u00e9chargements</strong> (application Fichiers).</p><p style="margin-top:8px;">Pour l\'envoyer : <strong>Gmail</strong> \u2192 Nouveau message \u2192 trombone <strong>Joindre un fichier</strong> \u2192 T\u00e9l\u00e9chargements.</p>'
               : '<p>Le fichier est dans le dossier <strong>T\u00e9l\u00e9chargements</strong> de l\'ordinateur. Joignez-le \u00e0 un nouveau mail.</p>')
    + (destinataires ? '<p style="margin-top:8px;">Destinataires : ' + escHtml(destinataires) + '</p>' : '')
    + '</div>';
  openDocModal('Fichier enregistr\u00e9', html, null, null);
}
''' + s[b:]
# 8. envoi du RJC : zip local
a = s.index('async function envoyerRJCEmail(affaire, destinataire) {'); b = s.index('function loadAffaire(id)')
s = s[:a] + r'''async function envoyerRJCEmail(affaire, destinataire) {
  if (!affaire) return;
  showToast('Pr\u00e9paration du registre...');
  try {
    var zip = new PizZip(), lignes = [], n = 0;
    lignes.push('REGISTRE-JOURNAL DE COORDINATION \u2014 ' + (affaire.num || '') + ' \u2014 ' + ((affaire.chantier && affaire.chantier.nom) || ''));
    lignes.push('');
    var entries = (affaire.rjc || []).slice().sort(function(x, y){ return (x.date || '').localeCompare(y.date || ''); });
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i], nomF = '';
      if (e.fichierPath || e.fichierData) {
        var d = e.fichierPath ? await FichiersLocaux.lire(e.fichierPath) : e.fichierData;
        if (d) { nomF = String(i + 1).padStart(3, '0') + '_' + (e.fichierNom || 'fichier').replace(/[\\/:*?"<>|]/g, '_'); zip.file('fichiers/' + nomF, d.split(',')[1] || '', { base64: true }); n++; }
      }
      lignes.push(formatDateFR(e.date) + ' | ' + libelleRJC(e) + (e.objet ? ' | ' + e.objet : '') + (nomF ? ' | fichier : ' + nomF : ' | (sans fichier)'));
    }
    zip.file('RJC_liste.txt', lignes.join('\r\n'));
    var blob = zip.generate({ type: 'blob' });
    enregistrerEtExpliquer(blob, 'RJC_' + String(affaire.num || 'affaire').replace(/[^A-Za-z0-9_-]+/g, '_') + '.zip', destinataire || '');
    showToast('Registre pr\u00eat : ' + entries.length + ' entr\u00e9e(s), ' + n + ' fichier(s)', 'success');
  } catch (err) { showToast('Registre : ' + err.message, 'error'); }
}

''' + s[b:]
# 9. sauvegarde : avec les fichiers du registre
a = s.index('function exporterSauvegarde(){'); b = s.index('function ouvrirSauvegardes(){')
s = s[:a] + r'''async function exporterSauvegarde(){
  var fichiers = {}, cles = await FichiersLocaux.cles();
  for (var i = 0; i < cles.length; i++) fichiers[cles[i]] = await FichiersLocaux.lire(cles[i]);
  var data = JSON.stringify({ format: 'csps17', version: 2, exporteLe: new Date().toISOString(), affaires: affaires, fichiers: fichiers });
  var d = new Date(); var p=function(n){return (n<10?'0':'')+n;};
  var nom = 'CSPS17_SAUVEGARDE_' + d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes()) + '.json';
  enregistrerEtExpliquer(new Blob([data], {type:'application/json'}), nom, '');
  showToast('Sauvegarde : ' + affaires.length + ' affaire(s), ' + cles.length + ' fichier(s)', 'success');
}

function importerSauvegardeFichier(input){
  var file = input.files && input.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = async function(){
    try{
      var brut = JSON.parse(reader.result), imported, fichiers = {};
      if (Array.isArray(brut)) imported = brut;
      else if (brut && brut.format === 'csps17' && Array.isArray(brut.affaires)) { imported = brut.affaires; fichiers = brut.fichiers || {}; }
      else throw new Error('Format invalide');
      var nf = 0;
      for (var k in fichiers) { if (!(await FichiersLocaux.lire(k))) { await FichiersLocaux.ecrire(k, fichiers[k]); nf++; } }
      affaires = fusionnerAffaires(affaires, imported);
      localStorage.setItem('csps17_affaires', JSON.stringify(affaires));
      renderAffaireList();
      closeModal();
      showToast('Sauvegarde import\u00e9e : ' + imported.length + ' affaire(s), ' + nf + ' fichier(s) ajout\u00e9(s)', 'success');
    }catch(e){ showToast('Import impossible : ' + e.message, 'error'); }
  };
  reader.readAsText(file);
}

''' + s[b:]
rep("'<p style=\"margin-bottom:12px;\">Vos affaires sont stockees dans ce navigateur et synchronisees avec le serveur. '\n    + 'Faites un export regulier : c\\'est votre sauvegarde sure, independante du serveur.</p>'",
    "'<p style=\"margin-bottom:12px;\">Vos affaires et les fichiers du registre sont enregistr\u00e9s dans cet appareil uniquement. '\n    + 'Exportez r\u00e9guli\u00e8rement : la sauvegarde sert aussi \u00e0 passer vos affaires du PC \u00e0 la tablette (par mail).</p>'")
# 9b. plus d'envoi automatique (il n'y a plus de serveur de mail)
rep("if (opts.auto) { return envoyerDocReel(affaire, e, ''); }", "if (opts.auto) { return; }")
# 9c. CR de visite : modele v3 et generateur valide le 28/09 (gen-visite.js)
rep('<script src="local-api.js"></script>', '<script src="local-api.js"></script>\n<script src="gen-visite.js"></script>')
rep("""    finalZip = nettoyerDocx(finalZip, data);
    var out = finalZip.generate({""", """    finalZip = nettoyerDocx(finalZip, data);
    if (ref === 'VIS' && window.GenVisite && typeof terrainAffaire !== 'undefined' && terrainAffaire && terrainAffaire._visite) {
      finalZip = await crVisiteV3(data, terrainAffaire);
    }
    var out = finalZip.generate({""")
rep("async function genTerrainDoc(ref) { ouvrirFormulaireDoc(ref); }", r"""async function genTerrainDoc(ref) { ouvrirFormulaireDoc(ref); }

// CR de visite v3 (modele corrige et valide le 28/09) a partir de la saisie terrain
function dimensionsPhoto(url){
  return new Promise(function(ok){ var im = new Image(); im.onload = function(){ ok({ w: im.naturalWidth, h: im.naturalHeight }); }; im.onerror = function(){ ok({ w: 4, h: 3 }); }; im.src = url; });
}
async function crVisiteV3(data, ta){
  var r = await fetch('modeles/CR_Visite_Chantier_CSPS17_v3.docx');
  if (!r.ok) throw new Error('Modele CR de visite v3 introuvable');
  var modele = new Uint8Array(await r.arrayBuffer());
  var v = ta._visite || {}, c = data.chantier || {}, tags = buildTagData(data);
  var no = parseInt(v.noVisite, 10) || 1, annee = (v.date || '').slice(0, 4) || String(new Date().getFullYear());
  var photos = [], lp = ta._photos || [], lg = ta._photosLegendes || [];
  for (var i = 0; i < lp.length; i++){ var d = await dimensionsPhoto(lp[i]); photos.push({ url: lp[i], w: d.w, h: d.h, legende: lg[i] || '' }); }
  var chantier = { nom: c.nom, adresse: c.adresse, nature: c.nature, moa: (data.moa || {}).nom, cat: data.cat, refPgc: tags.ref_pgc || '' };
  var cr = { date: v.date, heure: v.heure, no: no, ref: 'CSPS17/VIS/' + annee + '-' + String(no).padStart(3, '0'),
    meteo: v.meteo, phase: v.phase || '', avancement: v.avancement, prochaine: v.prochaine || '',
    entreprises: ta._entreprisesPresentes || [], observations: ta._observations || [], photos: photos,
    signatureCsps: (typeof sigData !== 'undefined' && sigData) ? sigData.csps : null };
  return GenVisite.genererCRVisite(modele, chantier, cr, PizZip, window.docxtemplater || window.Docxtemplater);
}""")
# 9d. bouton "Mettre a jour" (remplace Ctrl+Maj+R, utile sur la tablette)
rep('<button class="btn btn-outline btn-sm" onclick="ouvrirSauvegardes()"', '<button class="btn btn-outline btn-sm" onclick="mettreAJourAppli()" title="Charger la derniere version de l\'application">&#8635; Mettre \u00e0 jour</button>\n    <button class="btn btn-outline btn-sm" onclick="ouvrirSauvegardes()"')
rep("async function genTerrainDoc(ref) { ouvrirFormulaireDoc(ref); }", r"""async function genTerrainDoc(ref) { ouvrirFormulaireDoc(ref); }

// Mettre a jour : vide les copies gardees de complet/ (page, scripts, modeles Word)
// puis recharge depuis GitHub. Les affaires et fichiers du registre ne sont pas touches.
async function mettreAJourAppli(){
  showToast('Mise \u00e0 jour en cours...');
  try {
    if ('caches' in window) {
      var noms = await caches.keys();
      for (var i = 0; i < noms.length; i++) {
        var c = await caches.open(noms[i]), reqs = await c.keys();
        for (var j = 0; j < reqs.length; j++) if (reqs[j].url.indexOf('/complet/') !== -1) await c.delete(reqs[j]);
      }
    }
    var fichiers = ['index.html', 'local-api.js', 'gen-visite.js', 'lib/pizzip.js', 'lib/docxtemplater.js'];
    Object.keys(DOC_FILES).forEach(function(k){ fichiers.push('modeles/' + DOC_FILES[k]); });
    fichiers.push('modeles/CR_Visite_Chantier_CSPS17_v3.docx');
    await Promise.all(fichiers.map(function(f){ return fetch(f, { cache: 'reload' }).catch(function(){}); }));
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      var regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(function(r){ return r.update().catch(function(){}); }));
    }
  } catch (e) {}
  location.reload();
}""")
# 9e. synchronisation PC <-> tablette par le Google Drive dedie (bouton Synchroniser)
rep('<script src="gen-visite.js"></script>', '<script src="gen-visite.js"></script>\n<script src="https://accounts.google.com/gsi/client" async defer></script>\n<script src="sync-drive.js"></script>')
rep('<button class="btn btn-outline btn-sm" onclick="mettreAJourAppli()"', '<button class="btn btn-sm" id="btn-sync-drive" style="background:#16a34a;color:#fff;border:none;" onclick="synchroniserDrive()" title="Echanger les affaires et fichiers avec l\'autre appareil par le Drive CSPS17">&#8644; Synchroniser</button><span id="sync-drive-etat" style="font-size:12px;color:#555;"></span>\n    <button class="btn btn-outline btn-sm" onclick="mettreAJourAppli()"')
rep("  affaires = affaires.filter(function(x){ return x.id !== id; });\n  localStorage.setItem('csps17_affaires', JSON.stringify(affaires));",
    "  affaires = affaires.filter(function(x){ return x.id !== id; });\n  if (window.noterSuppressionAffaire) noterSuppressionAffaire(id);\n  localStorage.setItem('csps17_affaires', JSON.stringify(affaires));")
rep("var fichiers = ['index.html', 'local-api.js', 'gen-visite.js',", "var fichiers = ['index.html', 'local-api.js', 'gen-visite.js', 'sync-drive.js',")
# 9f. CR de visite : phase, prochaine intervention, lot et effectif ; vraie reference du PGC
rep('id="chantier-pc" placeholder="Ou N/A"></div>\n            </div>',
    'id="chantier-pc" placeholder="Ou N/A"></div>\n            </div>\n            <div class="form-row">\n              <div class="field"><label>R\u00e9f. du PGC (r\u00e9f\u00e9rence / indice)</label><input type="text" id="chantier-refpgc" placeholder="Ex : PGC indice A du 12/05/2026"></div>\n            </div>')
rep("   'chantier-dp','chantier-pc','chantier-hj',", "   'chantier-dp','chantier-pc','chantier-hj','chantier-refpgc',")
rep("      pc: document.getElementById('chantier-pc').value,", "      pc: document.getElementById('chantier-pc').value,\n      refPgc: document.getElementById('chantier-refpgc').value,")
rep("  document.getElementById('chantier-dp').value = c.dp || '';", "  document.getElementById('chantier-dp').value = c.dp || '';\n  document.getElementById('chantier-refpgc').value = c.refPgc || '';")
rep("    ref_pgc:          data.num || '',", "    ref_pgc:          (data.chantier && data.chantier.refPgc) || data.num || '',")
rep("  html2 += fieldRow('Avancement global', 'vis-avancement', 'text', 'Ex: 30% - Gros oeuvre en cours', '');",
    "  html2 += fieldRow('Avancement global', 'vis-avancement', 'text', 'Ex: 30% - Gros oeuvre en cours', '');\n  html2 += fieldRow('Phase / travaux en cours', 'vis-phase', 'text', 'Ex: Terrassement, fondations', '');\n  html2 += fieldRow('Prochaine intervention pr\u00e9vue', 'vis-prochaine', 'text', 'Ex: 15/10/2026 ou semaine 42', '');")
rep("      avancement: getVal('vis-avancement'),\n    };", "      avancement: getVal('vis-avancement'),\n      phase: getVal('vis-phase'),\n      prochaine: getVal('vis-prochaine'),\n    };")
rep("""  h += '<div class="field"><label style="font-size:11px;">Representant</label>""",
    """  h += '<div class="field"><label style="font-size:11px;">Lot</label><input type="text" class="vis-ent-lot" placeholder="Ex : Gros oeuvre" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:13px;"></div>';
  h += '<div class="field"><label style="font-size:11px;">Effectif pr\u00e9sent</label><input type="number" min="0" class="vis-ent-eff" placeholder="Nb" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:13px;"></div>';
  h += '<div class="field"><label style="font-size:11px;">Representant</label>""")
rep("    var nomEl = div.querySelector('.vis-ent-nom'); if(nomEl) nomEl.value = ent.nom || '';",
    "    var nomEl = div.querySelector('.vis-ent-nom'); if(nomEl) nomEl.value = ent.nom || '';\n    var lotEl = div.querySelector('.vis-ent-lot'); if(lotEl) lotEl.value = ent.lot || '';")
rep("      var lot = entDiv.querySelector('.vis-ent-lot');", "      var lot = entDiv.querySelector('.vis-ent-lot');\n      var eff = entDiv.querySelector('.vis-ent-eff');")
rep("          lot: lot ? lot.value : '',\n          effectif: '',", "          lot: lot ? lot.value : '',\n          effectif: eff ? eff.value : '',")
# 9g. onglet Documents : Conception / Realisation / CISSCT / DIUO (demande d'Alain 30/09)
a = s.index("  // Rangee Pieces du dossier (PGC + rapports/diagnostics)")
b = s.index("// ── INSERTION D'UN DOCUMENT REALISE HORS APPLICATION")
s = s[:a] + open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'onglet-documents.js'), encoding='utf-8').read() + s[b:]
rep("  reminder.textContent = 'Categorie ' + currentCat + ' - ' + docsForCat.length + ' documents disponibles sur 17';",
    "  reminder.textContent = 'Cat\u00e9gorie ' + currentCat + ' \u2014 ' + docsForCat.length + ' documents pour cette cat\u00e9gorie';")
# plus d'analyse IA au depot d'une piece : le fichier est simplement range au dossier
a = s.index("    ANALYSES_EN_COURS[type] = true;"); b = s.index("  } catch (err) {\n    showToast('Erreur depot : '", a)
s = s[:a] + s[b:]
# 9h. registre : chaque entree peut etre classee dans son document (demande d'Alain 30/09)
rep("""      if (e.objet && e.objet !== titre) html += '<div style="font-size:12px;color:var(--text-light);margin-top:2px;">' + escHtml(e.objet) + '</div>';
      html += '</div>'""", """      if (e.objet && e.objet !== titre) html += '<div style="font-size:12px;color:var(--text-light);margin-top:2px;">' + escHtml(e.objet) + '</div>';
      html += selectClassementRJC(e);
      html += '</div>'""")
rep("function libelleRJC(e) {", r"""// Classement d'une entree du registre dans un document de l'onglet Documents.
// Automatique pour les documents generes (nom CSPS17_<REF>_...), a choisir a la
// main pour les entrees ajoutees autrement (scan, note, ancien document...).
function classementActuelRJC(e) {
  if (e.docRef === 'AUCUN') return '';
  if (e.docRef) return e.docRef;
  var r = entryDocRef(e);
  if (r) return r;
  if (/pgc/i.test(e.fichierNom || '')) return 'PGC';
  return '';
}
function selectClassementRJC(e) {
  var actuel = classementActuelRJC(e);
  var opts = '<option value="">\u2014 non class\u00e9 \u2014</option>';
  var groupes = [['Pi\u00e8ces re\u00e7ues', PIECES_DOSSIER], ['Documents CSPS17', DOCS.filter(function(d){ return d.ref !== 'RJC'; })]];
  groupes.forEach(function(g){
    opts += '<optgroup label="' + g[0] + '">' + g[1].map(function(d){
      return '<option value="' + d.ref + '"' + (d.ref === actuel ? ' selected' : '') + '>' + d.title + '</option>';
    }).join('') + '</optgroup>';
  });
  return '<div style="margin-top:4px;font-size:11px;color:' + (actuel ? 'var(--text-light)' : '#b45309') + ';">Class\u00e9 dans : '
    + '<select onchange="classerEntreeRJC(\'' + e.id + '\', this.value)" style="font-size:11px;padding:2px 4px;border:1px solid ' + (actuel ? 'var(--border)' : '#f59e0b') + ';border-radius:4px;max-width:260px;">' + opts + '</select></div>';
}
function classerEntreeRJC(id, ref) {
  var affaire = currentAffaireObj(); if (!affaire) return;
  var e = (affaire.rjc || []).find(function(x){ return x.id === id; }); if (!e) return;
  e.docRef = ref || 'AUCUN';
  persistAffaires();
  try { renderRJCTab(); } catch (er) {}
  try { renderDocsGrid(); } catch (er2) {}
  showToast(ref ? 'Entr\u00e9e class\u00e9e' : 'Entr\u00e9e retir\u00e9e de son document', 'success');
}

function libelleRJC(e) {""")
# 9i. Fiche d'inspection commune verifiee (loi, CARSAT/OPPBTP) — decisions d'Alain 30/09
rep("  'FIC':         'Fiche_IC_Vierge_CSPS17_v15.docx',\n  'FIC3':        'Fiche_IC_Cat3_CSPS17_v4.docx',",
    "  'FIC':         'Fiche_IC_Vierge_CSPS17_v16.docx',\n  'FIC3':        'Fiche_IC_Cat3_CSPS17_v5.docx',")
rep("    ref_pgc:          (data.chantier && data.chantier.refPgc) || data.num || '',",
    "    ref_pgc:          (data.chantier && data.chantier.refPgc) || data.num || '',\n    antipoison:       centreAntipoison((data.chantier || {}).adresse),")
rep("var DOC_FILES = {", r"""// Centre antipoison competent selon le departement du chantier
// (carte officielle des 8 centres, centres-antipoison.net, verifiee le 30/09/2026).
var CENTRES_ANTIPOISON = {
  'Lille 08 00 59 59 59': ['02','59','60','62','80'],
  'Paris 01 40 05 48 48': ['75','77','78','91','92','93','94','95','971','972','973'],
  'Nancy 03 83 22 50 50': ['08','10','51','52','54','55','57','67','68','88','21','25','39','58','70','71','89','90'],
  'Angers 02 41 48 21 21': ['22','29','35','56','14','27','50','61','76','44','49','53','72','85','18','28','36','37','41','45'],
  'Bordeaux 05 56 96 40 80': ['16','17','19','23','24','33','40','47','64','79','86','87'],
  'Toulouse 05 61 77 74 47': ['09','11','12','30','31','32','34','46','48','65','66','81','82'],
  'Lyon 04 72 11 69 11': ['01','03','07','15','26','38','42','43','63','69','73','74'],
  'Marseille 04 91 75 25 25': ['04','05','06','13','83','84','2A','2B','20','974','976']
};
function centreAntipoison(adresse) {
  var cp = /\b(\d{5})\b/.exec(String(adresse || '').replace(/(\d{2})\s(\d{3})/, '$1$2'));
  if (!cp) return 'centre antipoison de la r\u00e9gion (voir centres-antipoison.net)';
  var dep = cp[1].slice(0, 2) === '97' ? cp[1].slice(0, 3) : cp[1].slice(0, 2);
  for (var k in CENTRES_ANTIPOISON) if (CENTRES_ANTIPOISON[k].indexOf(dep) !== -1) return k;
  return 'centre antipoison de la r\u00e9gion (voir centres-antipoison.net)';
}

var DOC_FILES = {""")
# sous-traitance : plus de case pre-cochee dans le modele, on coche la reponse donnee
a = s.index("function cocherSousTraitance(xmlStr, stOui) {"); b = s.index("// Cases a cocher de la Grille PPSPS", a)
s = s[:a] + r"""function cocherSousTraitance(xmlStr, stOui) {
  // Modele v5 : ni Oui ni Non pre-coche ; on coche la reponse du formulaire terrain.
  var idx = xmlStr.indexOf('sous-traitance envisag');
  if (idx === -1) return xmlStr;
  var pStart = Math.max(xmlStr.lastIndexOf('<w:p ', idx), xmlStr.lastIndexOf('<w:p>', idx));
  var pEnd = xmlStr.indexOf('</w:p>', idx) + '</w:p>'.length;
  var para = xmlStr.slice(pStart, pEnd);
  var n = 0;
  para = para.replace(/[\u2610\u2611]/g, function(){ n++; return (n === 1) === !!stOui ? '\u2611' : '\u2610'; });
  return xmlStr.slice(0, pStart) + para + xmlStr.slice(pEnd);
}

""" + s[b:]
# risques de la fiche Cat.3 : restes d'un ancien chantier retires, echelles, canicule
rep("'• L\\'utilisation des échelles et escabeaux comme postes de travail est strictement interdite.', '• Habilitations électriques à jour requises pour tout le personnel (si intervention sur réseaux).', '• Mutualisation de l\\'échafaudage de l\\'ITE validée après contrôle d\\'adéquation.']",
    "'• Règle du PGC de ce chantier : les échelles et escabeaux ne sont pas utilisés comme postes de travail (le Code du travail ne les admet qu\\'à titre exceptionnel, R.4323-63).']")
rep("'☑ Intervention en plénum (Électricité/Plomberie)'", "'☐ Intervention en plénum (Électricité/Plomberie)'")
rep("situations: ['Zone VIGILANCE ROUGE possible'], mesures: ['• Le chef d\\'entreprise et le Maître d\\'ouvrage doivent adopter des mesures de sauvegarde du personnel conformément décret n°2025-482 du 27 mai 2025.', '• Eau fraîche disponible en permanence.', '• Arrêt des travaux aux heures les plus chaudes si alerte rouge.']",
    "situations: ['Vigilance canicule Météo-France jaune, orange ou rouge'], mesures: ['• Dès la vigilance jaune, l\\'employeur met en œuvre et adapte les mesures de prévention (décret n°2025-482 du 27 mai 2025, art. R.4463-1 et s.).', '• Eau potable fraîche en quantité suffisante.', '• Adaptation des horaires, pauses, suspension des tâches pénibles aux heures les plus chaudes.']")
rep("if (ficData.meteoArret) canicule.push('arret travaux 12h-15h');", "if (ficData.meteoArret) canicule.push('horaires adaptes / taches penibles suspendues aux heures chaudes');")
rep("checkRow('Harnais antichute (> 2m)',", "checkRow('Harnais antichute (si protection collective impossible)',")
rep("checkRow('Arret travaux 12h-15h (canicule)',", "checkRow('Horaires adapt\u00e9s / t\u00e2ches p\u00e9nibles suspendues aux heures chaudes (canicule)',")
# 9j. mesures pre-remplies des risques verifiees (validees par Alain 30/09)
rep("mesures: ['• Rapport SS4 obligatoire avant intervention.', '• Procédure de décontamination stricte.', '• EPI niveau 3 obligatoires.']",
    "mesures: ['• Entreprise certifiée ; plan de démolition, de retrait ou d\\'encapsulage transmis via DEMAT@MIANTE au moins 30 jours avant le démarrage (R.4412-133).', '• Procédure de décontamination stricte.', '• EPI selon le niveau d\\'empoussièrement défini dans le plan de retrait.']")
rep("situations: ['☐ Charges > 25 kg', '☐ Gestes répétitifs'], mesures: ['• Aide mécanique obligatoire au-delà de 25 kg.', '• Rotation des postes si gestes répétitifs.']",
    "situations: ['☐ Charges lourdes ou répétées', '☐ Gestes répétitifs'], mesures: ['• Aides mécaniques à privilégier (R.4541-3 à R.4541-5).', '• Port habituel de plus de 55 kg seulement avec aptitude reconnue par le médecin du travail, jamais plus de 105 kg ; 25 kg maximum pour les femmes, 40 kg à la brouette (R.4541-9).']")
rep("mesures: ['• Protection auditive obligatoire si exposition > 80 dB.', '• Phasage des travaux bruyants si possible.']",
    "mesures: ['• Protection collective d\\'abord (R.4434-1 et s.) ; phasage des travaux bruyants.', '• Protections auditives mises à disposition dès 80 dB(A), port obligatoire dès 85 dB(A), 87 dB(A) valeur limite (R.4431-2).']")
rep("'• Masque FFP2 minimum.'", "'• Protection respiratoire adaptée, définie dans le PPSPS de l\\'entreprise.'")
rep("'• Vitesse limitée à 10 km/h sur chantier.'", "'• Vitesse limitée sur le chantier (valeur fixée par le PGC / plan de circulation).'")
rep("'• Arrêt des travaux en hauteur ou de levage si vent > 50-60 km/h ou alerte vigilance orange/rouge.'",
    "'• Arrêt des travaux en hauteur et du levage au-delà de la vitesse de vent maximale fixée par la notice du constructeur (grue, nacelle, échafaudage), ou en vigilance orange/rouge.'")
rep("checkRow('Arret travaux hauteur/levage si vent fort (>50-60 km/h)',", "checkRow('Arr\u00eat travaux hauteur/levage si vent au-del\u00e0 de la limite constructeur',")
# 9k. bug ancien : le nettoyage des lignes vides du CR de visite s'appliquait a tous les
# documents ; sur la fiche IC Cat.3, le risque « Intemperies — Conditions meteo » faisait
# effacer tout le tableau des risques. Limite au CR de visite + reperage de ligne fiable.
rep("    finalZip = nettoyerDocx(finalZip, data);\n    if (ref === 'VIS'", "    if (ref === 'VIS') finalZip = nettoyerDocx(finalZip, data);\n    if (ref === 'VIS'")
rep("    var trStart = xmlStr.lastIndexOf('<w:tr ', pos);\n    var trEnd = xmlStr.indexOf('</w:tr>', pos) + 7;\n    if (trStart === -1 || trEnd < 7) continue;",
    "    var trStart = Math.max(xmlStr.lastIndexOf('<w:tr ', pos), xmlStr.lastIndexOf('<w:tr>', pos));\n    var trEnd = xmlStr.indexOf('</w:tr>', pos) + 7;\n    if (trStart === -1 || trEnd < 7) continue;")
# 9l. CR de visite v4 verifie (R.4532-38, CARSAT Centre-Ouest) — decisions d'Alain 30/09
rep("  var r = await fetch('modeles/CR_Visite_Chantier_CSPS17_v3.docx');", "  var r = await fetch('modeles/CR_Visite_Chantier_CSPS17_v4.docx');")
rep("    signatureCsps: (typeof sigData !== 'undefined' && sigData) ? sigData.csps : null };\n  return GenVisite.genererCRVisite(",
    """    signatureCsps: (typeof sigData !== 'undefined' && sigData) ? sigData.csps : null };
  // Suivi : observations du CR de visite precedent de cette affaire, puis memorisation des
  // observations de ce CR pour le suivant (synchronise avec la tablette avec l'affaire).
  var aff = affaires.find(function(x){ return x.id === ta.id; }) || ta;
  cr.observationsPrecedentes = (aff.derniereVisite && aff.derniereVisite.observations) || [];
  aff.derniereVisite = { date: v.date || '', no: no, observations: (ta._observations || []).filter(function(o){ return o && o.description; })
    .map(function(o){ return { description: o.description, responsable: o.responsable || '', delai: o.delai || '' }; }) };
  aff.savedAt = new Date().toISOString();
  try { localStorage.setItem('csps17_affaires', JSON.stringify(affaires)); } catch (eS) {}
  return GenVisite.genererCRVisite(""")
rep("fichiers.push('modeles/CR_Visite_Chantier_CSPS17_v3.docx');", "fichiers.push('modeles/CR_Visite_Chantier_CSPS17_v4.docx');")
# 10. version
import datetime
s = re.sub(r'v2\.46 &middot; build [^<]*', 'v3.0 &middot; ' + datetime.datetime.now(__import__('zoneinfo').ZoneInfo('Europe/Paris')).strftime('%d/%m %H:%M'), s, count=1)
open(sys.argv[2], 'w', encoding='utf-8', newline='\n').write(s)
print('ok', len(s))
