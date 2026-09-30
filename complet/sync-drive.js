// ===== CSPS17 — Synchronisation PC <-> tablette par le Google Drive dedie =====
// Un seul bouton "Synchroniser" sur chaque appareil. Rien ne bouge tout seul.
// - Dossier "CSPS17" du Drive, cree par l'appli (acces limite a ses propres fichiers).
// - CSPS17_donnees.json : affaires + affaires supprimees + etat des pieces jointes.
// - Pieces jointes (Word, photos...) : un fichier Drive chacune, supprime du Drive
//   des que tous les appareils l'ont recuperee. Le Drive n'est qu'un point de passage.
(function(){
  var CLIENT_ID = '282523067881-3ia7tora957rq0d3eb256o88m39jiekg.apps.googleusercontent.com';
  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var API = 'https://www.googleapis.com/drive/v3/files', UP = 'https://www.googleapis.com/upload/drive/v3/files';
  var NOM_DOSSIER = 'CSPS17', NOM_INDEX = 'CSPS17_donnees.json';
  var jeton = null, jetonFin = 0, clientJeton = null;

  // --- identite de l'appareil ---
  function appareil(){
    var a = null; try { a = JSON.parse(localStorage.getItem('csps17_appareil') || 'null'); } catch (e) {}
    if (!a) {
      a = { id: 'app-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            nom: /Android|iPad|Tablet/i.test(navigator.userAgent) ? 'Tablette' : 'PC' };
      localStorage.setItem('csps17_appareil', JSON.stringify(a));
    }
    return a;
  }
  // --- affaires supprimees (pour que la suppression passe aussi sur l'autre appareil) ---
  function supprimees(){ try { return JSON.parse(localStorage.getItem('csps17_supprimees') || '{}'); } catch (e) { return {}; } }
  window.noterSuppressionAffaire = function(id){
    var s = supprimees(); s[id] = new Date().toISOString();
    localStorage.setItem('csps17_supprimees', JSON.stringify(s));
  };

  // --- connexion Google ---
  function chargerGoogle(){
    if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
    return new Promise(function(ok, ko){
      var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client';
      s.onload = function(){ ok(); }; s.onerror = function(){ ko(new Error('Pas de réseau : connexion à Google impossible')); };
      document.head.appendChild(s);
    });
  }
  function obtenirJeton(){
    if (jeton && Date.now() < jetonFin - 60000) return Promise.resolve(jeton);
    return chargerGoogle().then(function(){
      return new Promise(function(ok, ko){
        clientJeton = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID, scope: SCOPE, hint: 'cspsdonnees@gmail.com',
          callback: function(r){
            if (r.error) return ko(new Error('Connexion Google refusée : ' + r.error));
            jeton = r.access_token; jetonFin = Date.now() + (r.expires_in || 3600) * 1000; ok(jeton);
          },
          error_callback: function(e){ ko(new Error('Connexion Google interrompue' + (e && e.type ? ' (' + e.type + ')' : ''))); }
        });
        clientJeton.requestAccessToken({ prompt: '' });
      });
    });
  }
  function drive(url, opts){
    opts = opts || {}; opts.headers = opts.headers || {};
    opts.headers.Authorization = 'Bearer ' + jeton;
    return fetch(url, opts).then(function(r){
      if (!r.ok) return r.text().then(function(t){ throw new Error('Drive ' + r.status + ' : ' + t.slice(0, 160)); });
      return r;
    });
  }
  function chercher(q){
    return drive(API + '?q=' + encodeURIComponent(q + ' and trashed=false') + '&fields=files(id,name)&spaces=drive')
      .then(function(r){ return r.json(); }).then(function(j){ return j.files || []; });
  }
  function creerDossier(nom, parent){
    var meta = { name: nom, mimeType: 'application/vnd.google-apps.folder' }; if (parent) meta.parents = [parent];
    return drive(API + '?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meta) })
      .then(function(r){ return r.json(); }).then(function(j){ return j.id; });
  }
  function envoyerFichier(nom, parent, blob, idExistant){
    var meta = idExistant ? {} : { name: nom, parents: [parent] };
    var corps = new FormData();
    corps.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    corps.append('file', blob);
    var url = idExistant ? UP + '/' + idExistant + '?uploadType=multipart&fields=id' : UP + '?uploadType=multipart&fields=id';
    return drive(url, { method: idExistant ? 'PATCH' : 'POST', body: corps }).then(function(r){ return r.json(); }).then(function(j){ return j.id; });
  }
  function lireFichierDrive(id){ return drive(API + '/' + id + '?alt=media'); }
  function effacerFichierDrive(id){ return drive(API + '/' + id, { method: 'DELETE' }).catch(function(){}); }

  // Fusion : pour chaque affaire, la version la plus recente gagne, MAIS les entrees
  // du registre (documents generes, notes) des deux appareils sont toujours reunies :
  // un document fait sur la tablette n'efface jamais une saisie faite sur le PC.
  function fusionnerAvecRegistre(locales, distantes){
    var parId = {}, autres = {};
    (locales || []).forEach(function(a){ if (a && a.id) parId[a.id] = a; });
    (distantes || []).forEach(function(d){
      if (!d || !d.id) return;
      var l = parId[d.id];
      if (!l) { parId[d.id] = d; return; }
      var gagnant = ((d.savedAt || '') > (l.savedAt || '')) ? d : l, perdant = gagnant === d ? l : d;
      var ids = {}; (gagnant.rjc || []).forEach(function(e){ if (e && e.id) ids[e.id] = true; });
      var ajout = (perdant.rjc || []).filter(function(e){ return e && e.id && !ids[e.id]; });
      if (ajout.length) {
        gagnant = JSON.parse(JSON.stringify(gagnant));
        gagnant.rjc = (gagnant.rjc || []).concat(ajout).sort(function(x, y){ return (x.date || '').localeCompare(y.date || ''); });
        gagnant.savedAt = new Date().toISOString();
      }
      parId[d.id] = gagnant;
    });
    return Object.keys(parId).map(function(k){ return parId[k]; });
  }
  function fichiersSupprimes(){ try { return JSON.parse(localStorage.getItem('csps17_fichiers_supprimes') || '{}'); } catch (e) { return {}; } }
  window.noterSuppressionFichier = function(ch){
    var s = fichiersSupprimes(); s[ch] = new Date().toISOString();
    localStorage.setItem('csps17_fichiers_supprimes', JSON.stringify(s));
  };
  function blobVersDataUrl(b){
    return new Promise(function(ok){ var f = new FileReader(); f.onload = function(){ ok(f.result); }; f.readAsDataURL(b); });
  }
  function nomDrive(chemin){ return chemin.replace(/[\\/]/g, '__'); }

  // --- synchronisation ---
  async function synchroniser(){
    var moi = appareil(), bilan = { recues: 0, envoyees: 0, fichiersEnvoyes: 0, fichiersRecus: 0, nettoyes: 0 };
    etat('Connexion à Google...');
    await obtenirJeton();
    etat('Lecture du Drive...');
    var dossiers = await chercher("name='" + NOM_DOSSIER + "' and mimeType='application/vnd.google-apps.folder'");
    var dossier = dossiers.length ? dossiers[0].id : await creerDossier(NOM_DOSSIER);
    var sousDos = await chercher("name='fichiers' and '" + dossier + "' in parents and mimeType='application/vnd.google-apps.folder'");
    var dossierFichiers = sousDos.length ? sousDos[0].id : await creerDossier('fichiers', dossier);
    var idx = await chercher("name='" + NOM_INDEX + "' and '" + dossier + "' in parents");
    var idIndex = idx.length ? idx[0].id : null;
    var distant = { affaires: [], supprimees: {}, fichiers: {}, appareils: {} };
    if (idIndex) { try { distant = await (await lireFichierDrive(idIndex)).json(); } catch (e) { throw new Error('Fichier CSPS17_donnees.json illisible sur le Drive'); } }
    distant.affaires = distant.affaires || []; distant.supprimees = distant.supprimees || {};
    distant.fichiers = distant.fichiers || {}; distant.appareils = distant.appareils || {};
    distant.appareils[moi.id] = { nom: moi.nom, vu: new Date().toISOString() };

    // 1. affaires supprimees (des deux cotes)
    var sup = supprimees();
    Object.keys(distant.supprimees).forEach(function(k){ if (!sup[k]) sup[k] = distant.supprimees[k]; });
    localStorage.setItem('csps17_supprimees', JSON.stringify(sup));
    // 2. fusion : pour chaque affaire, la version la plus recente
    var avant = {}; affaires.forEach(function(a){ avant[a.id] = a.savedAt || ''; });
    var fusion = fusionnerAvecRegistre(affaires, distant.affaires).filter(function(a){ return !sup[a.id]; });
    fusion.forEach(function(a){ if (avant[a.id] === undefined || (a.savedAt || '') > avant[a.id]) bilan.recues++; });
    var avantDistant = {}; distant.affaires.forEach(function(a){ avantDistant[a.id] = a.savedAt || ''; });
    fusion.forEach(function(a){ if (avantDistant[a.id] === undefined || (a.savedAt || '') > avantDistant[a.id]) bilan.envoyees++; });
    affaires = fusion;
    localStorage.setItem('csps17_affaires', JSON.stringify(affaires));

    // 3. pieces jointes
    var locaux = await FichiersLocaux.cles(), aLocal = {};
    locaux.forEach(function(k){ aLocal[k] = true; });
    var fsup = fichiersSupprimes(); distant.fichiersSupprimes = distant.fichiersSupprimes || {};
    Object.keys(distant.fichiersSupprimes).forEach(function(k){ if (!fsup[k]) fsup[k] = distant.fichiersSupprimes[k]; });
    localStorage.setItem('csps17_fichiers_supprimes', JSON.stringify(fsup));
    for (var z in fsup) {
      if (aLocal[z]) { await FichiersLocaux.effacer(z); delete aLocal[z]; }
      if (distant.fichiers[z]) { if (distant.fichiers[z].id) await effacerFichierDrive(distant.fichiers[z].id); delete distant.fichiers[z]; }
    }
    distant.fichiersSupprimes = fsup;
    locaux = locaux.filter(function(k){ return aLocal[k]; });
    for (var i = 0; i < locaux.length; i++) {
      var ch = locaux[i], f = distant.fichiers[ch];
      if (!f) {
        etat('Envoi des fichiers... ' + (bilan.fichiersEnvoyes + 1));
        var d = await FichiersLocaux.lire(ch);
        var idF = await envoyerFichier(nomDrive(ch), dossierFichiers, new Blob([d], { type: 'text/plain' }));
        distant.fichiers[ch] = { id: idF, par: [moi.id] }; bilan.fichiersEnvoyes++;
      } else if (f.par.indexOf(moi.id) === -1) f.par.push(moi.id);
    }
    var chemins = Object.keys(distant.fichiers);
    for (var j = 0; j < chemins.length; j++) {
      var c = chemins[j], fi = distant.fichiers[c];
      if (!aLocal[c] && fi.id) {
        etat('Réception des fichiers... ' + (bilan.fichiersRecus + 1));
        var contenu = await (await lireFichierDrive(fi.id)).text();
        await FichiersLocaux.ecrire(c, contenu);
        if (fi.par.indexOf(moi.id) === -1) fi.par.push(moi.id); bilan.fichiersRecus++;
      }
    }
    // 4. nettoyage : un fichier recupere par tous les appareils quitte le Drive
    var ids = Object.keys(distant.appareils);
    for (var k = 0; k < chemins.length; k++) {
      var fx = distant.fichiers[chemins[k]];
      if (fx.id && ids.length > 1 && ids.every(function(a){ return fx.par.indexOf(a) !== -1; })) {
        await effacerFichierDrive(fx.id); fx.id = null; bilan.nettoyes++;
      }
    }
    // 5. ecriture du fichier commun
    etat('Enregistrement sur le Drive...');
    distant.affaires = affaires; distant.supprimees = sup; distant.maj = new Date().toISOString(); distant.format = 'csps17-sync';
    var blobIndex = new Blob([JSON.stringify(distant)], { type: 'application/json' });
    await envoyerFichier(NOM_INDEX, dossier, blobIndex, idIndex);
    localStorage.setItem('csps17_derniere_synchro', distant.maj);
    return bilan;
  }

  function etat(t){ var e = document.getElementById('sync-drive-etat'); if (e) e.textContent = t; }
  window.synchroniserDrive = async function(){
    var btn = document.getElementById('btn-sync-drive'); if (btn) btn.disabled = true;
    showToast('Synchronisation en cours...');
    try {
      var b = await synchroniser();
      renderAffaireList(); if (typeof renderDashboard === 'function') { try { renderDashboard(); } catch (e) {} }
      etat('');
      showToast('Synchronisé : ' + b.recues + ' affaire(s) reçue(s) ou mise(s) à jour, ' + b.envoyees + ' envoyée(s) ; fichiers : '
        + b.fichiersEnvoyes + ' envoyé(s), ' + b.fichiersRecus + ' reçu(s)' + (b.nettoyes ? ', ' + b.nettoyes + ' retiré(s) du Drive' : ''), 'success');
    } catch (e) {
      etat(''); showToast('Synchronisation impossible : ' + e.message, 'error');
    }
    if (btn) btn.disabled = false;
  };
  window.CSPS17Sync = { appareil: appareil };
})();
