# Construit complet/index.html a partir de l'ancien CSPS17 (debranche du serveur)
import re, sys
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
# 10. version
import datetime
s = re.sub(r'v2\.46 &middot; build [^<]*', 'v3.0 &middot; ' + datetime.datetime.now(__import__('zoneinfo').ZoneInfo('Europe/Paris')).strftime('%d/%m %H:%M'), s, count=1)
open(sys.argv[2], 'w', encoding='utf-8', newline='\n').write(s)
print('ok', len(s))
