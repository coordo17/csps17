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
        // 09/11 (demande d'Alain) : quand la fenetre de connexion Google est
        // bloquee par le navigateur (pop-up bloque, cookies tiers restreints),
        // ni callback ni error_callback ne se declenchent -- le bouton
        // "Synchroniser" restait grise indefiniment, sans aucun message.
        // Garde-fou : si rien ne s'est passe apres 15 s, on abandonne avec un
        // message explicite plutot que de rester bloque sans explication.
        var fini = false;
        var delai = setTimeout(function(){
          if (fini) return; fini = true;
          ko(new Error('Pas de réponse de Google après 15 s — la fenêtre de connexion a probablement été bloquée par le navigateur (pop-up). Autorisez les pop-up pour ce site puis réessayez.'));
        }, 15000);
        clientJeton = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID, scope: SCOPE, hint: 'cspsdonnees@gmail.com',
          callback: function(r){
            if (fini) return; fini = true; clearTimeout(delai);
            if (r.error) return ko(new Error('Connexion Google refusée : ' + r.error));
            jeton = r.access_token; jetonFin = Date.now() + (r.expires_in || 3600) * 1000; ok(jeton);
          },
          error_callback: function(e){
            if (fini) return; fini = true; clearTimeout(delai);
            ko(new Error('Connexion Google interrompue' + (e && e.type ? ' (' + e.type + ')' : '')));
          }
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
  // 16/11 (demande d'Alain, suite aux echecs de synchro sur de gros fichiers
  // depuis la tablette -- "53 secondes" puis plantage) : l'envoi en
  // "multipart" (ancien envoyerFichier, garde juste en dessous pour les tout
  // petits fichiers) renvoie TOUT le fichier en une seule requete -- sur un
  // reseau instable (wifi tablette), une coupure en cours d'envoi d'un PDF
  // de plusieurs Mo faisait tout perdre et il fallait tout renvoyer depuis
  // le debut. Google recommande "resumable" au-dela de 5 Mo ou sur reseau
  // instable : la session connait l'octet exact recu, donc une coupure ne
  // fait reprendre que depuis cet octet, pas depuis zero.
  // Reference : https://developers.google.com/drive/manage-uploads
  var SEUIL_RESUMABLE = 5 * 1024 * 1024; // 5 Mo, seuil recommande par Google
  function envoyerFichierMultipart(nom, parent, blob, idExistant){
    var meta = idExistant ? {} : { name: nom, parents: [parent] };
    var corps = new FormData();
    corps.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    corps.append('file', blob);
    var url = idExistant ? UP + '/' + idExistant + '?uploadType=multipart&fields=id' : UP + '?uploadType=multipart&fields=id';
    return drive(url, { method: idExistant ? 'PATCH' : 'POST', body: corps }).then(function(r){ return r.json(); }).then(function(j){ return j.id; });
  }
  async function demarrerSessionResumable(nom, parent, idExistant){
    var meta = idExistant ? {} : { name: nom, parents: [parent] };
    var url = (idExistant ? UP + '/' + idExistant : UP) + '?uploadType=resumable&fields=id';
    var r = await drive(url, {
      method: idExistant ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(meta)
    });
    var loc = r.headers.get('Location');
    if (!loc) throw new Error('Drive : session resumable non demarree (pas d\'URL de session renvoyee)');
    return loc;
  }
  // Interroge le serveur pour savoir jusqu'ou l'envoi precedent est arrive
  // (reponse 308 + en-tete Range) -- permet de reprendre exactement a cet
  // octet au lieu de tout renvoyer. Renvoie le prochain octet a envoyer, ou
  // 'termine' si le fichier est en fait deja recu en entier (rare, mais
  // possible si la confirmation s'est perdue en retour).
  async function octetDeReprise(sessionUrl, total){
    var r = await fetch(sessionUrl, { method: 'PUT', headers: { 'Content-Range': 'bytes */' + total } });
    if (r.status === 200 || r.status === 201) return 'termine';
    if (r.status === 308) {
      var range = r.headers.get('Range');
      var m = range && /bytes=0-(\d+)/.exec(range);
      return m ? (parseInt(m[1], 10) + 1) : 0;
    }
    throw new Error('Drive : statut resumable inattendu (' + r.status + ')');
  }
  async function envoyerFichierResumable(nom, parent, blob, idExistant){
    var total = blob.size, sessionUrl = await demarrerSessionResumable(nom, parent, idExistant);
    var debut = 0, essai = 0, derniereErreur = null;
    while (essai < 5) {
      essai++;
      try {
        var tranche = blob.slice(debut);
        var r = await fetch(sessionUrl, {
          method: 'PUT',
          headers: { 'Content-Length': String(tranche.size), 'Content-Range': 'bytes ' + debut + '-' + (total - 1) + '/' + total },
          body: tranche
        });
        if (r.status === 200 || r.status === 201) { var j = await r.json(); return j.id; }
        if (r.status === 308) { // envoi partiel accepte (rare en un seul bloc, gere quand meme)
          var range = r.headers.get('Range'); var m = range && /bytes=0-(\d+)/.exec(range);
          debut = m ? (parseInt(m[1], 10) + 1) : debut;
          continue;
        }
        throw new Error('Drive resumable ' + r.status + ' : ' + (await r.text()).slice(0, 160));
      } catch (e) {
        derniereErreur = e;
        // coupure reseau en plein envoi : on redemande au serveur ou il en
        // est reellement avant de reprendre, plutot que de rejouer a l'aveugle.
        try {
          var reprise = await octetDeReprise(sessionUrl, total);
          if (reprise === 'termine') return null; // deja recu, rien de plus a faire
          debut = reprise;
        } catch (e2) { /* le serveur ne repond pas non plus -- nouvel essai depuis le dernier point connu */ }
      }
    }
    throw derniereErreur || new Error('Drive : envoi resumable echoue apres plusieurs tentatives');
  }
  function envoyerFichier(nom, parent, blob, idExistant){
    if (blob.size <= SEUIL_RESUMABLE) return envoyerFichierMultipart(nom, parent, blob, idExistant);
    return envoyerFichierResumable(nom, parent, blob, idExistant);
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

  // 16/11 (demande d'Alain, synchro plus rapide + un fichier en echec ne
  // doit plus bloquer les autres) : execute fn(item) sur chaque element de
  // "liste", "taille" a la fois en parallele (au lieu d'un par un), et
  // rattrape l'erreur de chaque appel individuellement -- une piece jointe
  // qui echoue (meme apres les tentatives de reprise resumable) est notee
  // dans "erreurs" plutot que de faire planter tout le lot.
  async function traiterParLots(liste, taille, fn, erreurs){
    for (var deb = 0; deb < liste.length; deb += taille) {
      var lot = liste.slice(deb, deb + taille);
      await Promise.all(lot.map(function(item){
        return Promise.resolve().then(function(){ return fn(item); }).catch(function(e){
          erreurs.push((item || '') + ' : ' + (e && e.message || e));
        });
      }));
    }
  }

  // --- synchronisation ---
  async function synchroniser(){
    var moi = appareil(), bilan = { recues: 0, envoyees: 0, fichiersEnvoyes: 0, fichiersRecus: 0, nettoyes: 0, erreursFichiers: [] };
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
    // 2. fichiers supprimes (comptabilite globale, potentiellement
    // volumineuse si accumulee depuis longtemps sur les deux appareils)
    var fsup = fichiersSupprimes(); distant.fichiersSupprimes = distant.fichiersSupprimes || {};
    Object.keys(distant.fichiersSupprimes).forEach(function(k){ if (!fsup[k]) fsup[k] = distant.fichiersSupprimes[k]; });
    localStorage.setItem('csps17_fichiers_supprimes', JSON.stringify(fsup));
    var locauxTous = await FichiersLocaux.cles(), aLocal = {};
    locauxTous.forEach(function(k){ aLocal[k] = true; });
    // 16/11 (bug constate par Alain, St-Mars-la-Briere incomplete sur la
    // tablette) : ce nettoyage reprenait A CHAQUE synchro TOUTES les
    // suppressions jamais notees depuis le debut -- des centaines d'appels
    // de suppression Drive un par un (presque tous deja supprimes, donc en
    // echec 404), au point d'epuiser a lui seul tout le delai global avant
    // meme d'avoir commence a traiter les affaires. Les suppressions Drive
    // partent maintenant toutes EN PARALLELE (beaucoup plus rapide), et le
    // resultat est aussitot confirme sur le Drive -- pour que ce nettoyage
    // ne soit plus jamais refait si la suite (les affaires) venait a
    // depasser le delai.
    var aEffacerDrive = [];
    for (var z in fsup) {
      if (aLocal[z]) { await FichiersLocaux.effacer(z); delete aLocal[z]; }
      if (distant.fichiers[z]) {
        if (distant.fichiers[z].id) aEffacerDrive.push(distant.fichiers[z].id);
        delete distant.fichiers[z];
      }
    }
    if (aEffacerDrive.length) {
      etat('Nettoyage (' + aEffacerDrive.length + ' fichier(s) deja supprime(s))...');
      await Promise.all(aEffacerDrive.map(function(id){ return effacerFichierDrive(id); }));
    }
    distant.fichiersSupprimes = fsup;
    if (aEffacerDrive.length) {
      distant.affaires = affaires; distant.supprimees = sup; distant.maj = new Date().toISOString(); distant.format = 'csps17-sync';
      idIndex = await envoyerFichier(NOM_INDEX, dossier, new Blob([JSON.stringify(distant)], { type: 'application/json' }), idIndex);
    }

    // 16/11 (demande d'Alain, suite au bug du 45 s depasse sur un gros
    // import) : fusion ET transfert des pieces jointes AFFAIRE PAR AFFAIRE
    // -- chaque affaire traitee est aussitot reconfirmee par une reecriture
    // du fichier partage sur le Drive avant de passer a la suivante, au
    // lieu d'un seul gros bloc "tout ou rien" a la fin. Si le delai est
    // depasse en cours de route, les affaires deja traitees restent
    // acquises sur le Drive (et donc sur l'autre appareil) ; il ne reste
    // plus qu'a relancer "Synchroniser" pour reprendre sur les suivantes.
    var parLocale = {}; affaires.forEach(function(a){ if (a && a.id) parLocale[a.id] = a; });
    var parDistante = {}; distant.affaires.forEach(function(d){ if (d && d.id) parDistante[d.id] = d; });
    var tousIds = Object.keys(parLocale).concat(Object.keys(parDistante)).filter(function(id, i, arr){ return arr.indexOf(id) === i; })
      .filter(function(id){ return !sup[id]; });

    var affairesMaj = [];
    for (var n = 0; n < tousIds.length; n++) {
      var id = tousIds[n], l = parLocale[id], d = parDistante[id], gagnant;
      if (l && d) {
        gagnant = ((d.savedAt || '') > (l.savedAt || '')) ? d : l;
        var perdant = gagnant === d ? l : d;
        var idsRjc = {}; (gagnant.rjc || []).forEach(function(e){ if (e && e.id) idsRjc[e.id] = true; });
        var ajoutRjc = (perdant.rjc || []).filter(function(e){ return e && e.id && !idsRjc[e.id]; });
        if (ajoutRjc.length) {
          gagnant = JSON.parse(JSON.stringify(gagnant));
          gagnant.rjc = (gagnant.rjc || []).concat(ajoutRjc).sort(function(x, y){ return (x.date || '').localeCompare(y.date || ''); });
          gagnant.savedAt = new Date().toISOString();
        }
        if ((gagnant.savedAt || '') > (l.savedAt || '')) bilan.recues++;
        if ((gagnant.savedAt || '') > (d.savedAt || '')) bilan.envoyees++;
      } else if (d && !l) { gagnant = d; bilan.recues++; }
      else { gagnant = l; bilan.envoyees++; }
      affairesMaj.push(gagnant);
      // 16/11 (demande d'Alain) : une affaire qui n'a pas bouge (meme
      // contenu des deux cotes) ne doit pas declencher une reecriture
      // Drive -- seul un vrai changement (fusion differente, ou nouvelle
      // piece jointe transferee plus bas) justifie de reconfirmer.
      var changeAffaire = JSON.stringify(gagnant) !== JSON.stringify(l) || JSON.stringify(gagnant) !== JSON.stringify(d);

      // pieces jointes propres a CETTE affaire (chemin local toujours de la
      // forme "local/<idAffaire>/..." -- cf. local-api.js) : transferees
      // ici, avant de confirmer l'affaire sur le Drive.
      //
      // 16/11 (demande d'Alain, synchro trop lente + plantage total sur un
      // seul fichier en echec) : les pieces jointes partent maintenant PAR
      // LOTS DE 3 EN PARALLELE (plus rapide qu'une a la fois) et chaque
      // fichier est protege par son propre try/catch -- un fichier qui
      // echoue malgre les tentatives de reprise (voir envoyerFichierResumable
      // ci-dessus) est signale dans le bilan au lieu de faire planter toute
      // la synchro et perdre les affaires suivantes.
      var prefixe = 'local/' + id + '/';
      var locauxAffaire = locauxTous.filter(function(k){ return k.indexOf(prefixe) === 0 && aLocal[k]; });
      var aEnvoyer = locauxAffaire.filter(function(ch){ return !distant.fichiers[ch]; });
      var dejaConnus = locauxAffaire.filter(function(ch){ var f = distant.fichiers[ch]; return f && f.par.indexOf(moi.id) === -1; });
      dejaConnus.forEach(function(ch){ distant.fichiers[ch].par.push(moi.id); changeAffaire = true; });
      await traiterParLots(aEnvoyer, 3, async function(ch){
        etat('Affaire ' + (n + 1) + '/' + tousIds.length + ' — envoi piece jointe (' + (bilan.fichiersEnvoyes + 1) + '/' + aEnvoyer.length + ')...');
        var don = await FichiersLocaux.lire(ch);
        var idF = await envoyerFichier(nomDrive(ch), dossierFichiers, new Blob([don], { type: 'text/plain' }));
        distant.fichiers[ch] = { id: idF, par: [moi.id] }; bilan.fichiersEnvoyes++; changeAffaire = true;
      }, bilan.erreursFichiers);
      var cheminsAffaire = Object.keys(distant.fichiers).filter(function(c){ return c.indexOf(prefixe) === 0; });
      var aRecevoir = cheminsAffaire.filter(function(c){ var fi = distant.fichiers[c]; return !aLocal[c] && fi.id; });
      await traiterParLots(aRecevoir, 3, async function(c){
        var fi = distant.fichiers[c];
        etat('Affaire ' + (n + 1) + '/' + tousIds.length + ' — reception piece jointe (' + (bilan.fichiersRecus + 1) + '/' + aRecevoir.length + ')...');
        var contenu = await (await lireFichierDrive(fi.id)).text();
        await FichiersLocaux.ecrire(c, contenu); aLocal[c] = true;
        if (fi.par.indexOf(moi.id) === -1) fi.par.push(moi.id); bilan.fichiersRecus++; changeAffaire = true;
      }, bilan.erreursFichiers);

      if (!changeAffaire) { etat('Affaire ' + (n + 1) + '/' + tousIds.length + ' deja a jour.'); continue; }

      // affaire (et ses pieces) a jour -- confirmee tout de suite sur le
      // Drive avant de passer a la suivante. Les affaires pas encore
      // traitees sont reportees telles quelles (pas encore fusionnees) :
      // sans ca le fichier partage les perdrait temporairement si la
      // synchro s'arretait juste apres cette ecriture.
      var resteAFaire = tousIds.slice(n + 1).map(function(id2){ return parLocale[id2] || parDistante[id2]; });
      affaires = affairesMaj.concat(resteAFaire);
      localStorage.setItem('csps17_affaires', JSON.stringify(affaires));
      distant.affaires = affairesMaj.concat(resteAFaire); distant.supprimees = sup; distant.maj = new Date().toISOString(); distant.format = 'csps17-sync';
      etat('Affaire ' + (n + 1) + '/' + tousIds.length + ' synchronisee.');
      idIndex = await envoyerFichier(NOM_INDEX, dossier, new Blob([JSON.stringify(distant)], { type: 'application/json' }), idIndex);
    }
    affaires = affairesMaj;
    localStorage.setItem('csps17_affaires', JSON.stringify(affaires));

    // pieces jointes "orphelines" : pas de affaireId au moment du depot
    // (ancien format), ou affaire depuis supprimee -- cas rare, traite en
    // bloc a part pour ne pas compliquer la boucle ci-dessus.
    var orphelinsLocaux = locauxTous.filter(function(k){
      if (!aLocal[k]) return false;
      var mId = /^local\/([^/]+)\//.exec(k);
      return !mId || tousIds.indexOf(mId[1]) === -1;
    });
    for (var o = 0; o < orphelinsLocaux.length; o++) {
      var cho = orphelinsLocaux[o];
      if (!distant.fichiers[cho]) {
        var dono = await FichiersLocaux.lire(cho);
        var idFo = await envoyerFichier(nomDrive(cho), dossierFichiers, new Blob([dono], { type: 'text/plain' }));
        distant.fichiers[cho] = { id: idFo, par: [moi.id] }; bilan.fichiersEnvoyes++;
      }
    }

    // nettoyage : un fichier recupere par tous les appareils quitte le Drive
    // (en parallele aussi, meme raison qu'au nettoyage du debut)
    var idsApp = Object.keys(distant.appareils);
    var chemins = Object.keys(distant.fichiers);
    var aEffacerFinal = [];
    for (var k = 0; k < chemins.length; k++) {
      var fx = distant.fichiers[chemins[k]];
      if (fx.id && idsApp.length > 1 && idsApp.every(function(a){ return fx.par.indexOf(a) !== -1; })) {
        aEffacerFinal.push(fx);
      }
    }
    if (aEffacerFinal.length) {
      etat('Nettoyage final (' + aEffacerFinal.length + ' fichier(s))...');
      await Promise.all(aEffacerFinal.map(function(fx2){ return effacerFichierDrive(fx2.id); }));
      aEffacerFinal.forEach(function(fx2){ fx2.id = null; bilan.nettoyes++; });
    }
    // ecriture finale (comptabilite des fichiers/appareils a jour)
    etat('Enregistrement sur le Drive...');
    distant.affaires = affaires; distant.supprimees = sup; distant.maj = new Date().toISOString(); distant.format = 'csps17-sync';
    await envoyerFichier(NOM_INDEX, dossier, new Blob([JSON.stringify(distant)], { type: 'application/json' }), idIndex);
    localStorage.setItem('csps17_derniere_synchro', distant.maj);
    return bilan;
  }

  function etat(t){ var e = document.getElementById('sync-drive-etat'); if (e) e.textContent = t; }
  window.synchroniserDrive = async function(){
    var btn = document.getElementById('btn-sync-drive'); if (btn) btn.disabled = true;
    // 16/11 (demande d'Alain, suite au cas de St-Mars-la-Briere absente de
    // la tablette) : si une affaire est ouverte a l'ecran au moment du clic
    // sur "Synchroniser", on l'enregistre d'abord automatiquement. Sans ca,
    // des modifications faites dans le formulaire mais pas encore
    // "Enregistrees" restaient seulement dans les champs et ne partaient
    // pas dans la synchro (qui, elle, travaille sur le tableau "affaires"
    // deja sauvegarde, pas sur les champs du formulaire).
    // Sans danger si aucune affaire n'est ouverte (currentAffaireId vide)
    // ou si rien de nouveau n'a ete saisi : dans ce cas on ne touche a rien.
    //
    // 16/11 (bug constate par Alain, St-Mars-la-Briere ecrasee par une
    // version incomplete) : si l'affaire ouverte a l'ecran est justement
    // une version INCOMPLETE recue d'une synchro precedente (sans
    // categorie, sans documents...), re-sauvegarder systematiquement
    // bumpait son savedAt a "maintenant" -- la faisant gagner la fusion
    // face a la bonne version complete de l'autre appareil, qui etait
    // pourtant plus ancienne mais meilleure ! On ne touche donc PLUS au
    // savedAt (et on n'ecrit rien) si les champs du formulaire sont
    // identiques a ce qui est deja enregistre : seul un vrai changement
    // de saisie doit faire gagner cette affaire dans la fusion.
    try {
      if (typeof currentAffaireId !== 'undefined' && currentAffaireId && typeof collectFormData === 'function') {
        var dataAvantSync = collectFormData();
        if (dataAvantSync && dataAvantSync.chantier && dataAvantSync.chantier.nom) {
          var idxAvantSync = affaires.findIndex(function(a){ return a.id === currentAffaireId; });
          if (idxAvantSync >= 0) {
            var avantSync = {};
            Object.keys(dataAvantSync).forEach(function(k){ avantSync[k] = affaires[idxAvantSync][k]; });
            if (JSON.stringify(avantSync) !== JSON.stringify(dataAvantSync)) {
              affaires[idxAvantSync] = Object.assign({}, affaires[idxAvantSync], dataAvantSync);
              affaires[idxAvantSync].savedAt = new Date().toISOString();
              localStorage.setItem('csps17_affaires', JSON.stringify(affaires));
            }
          }
        }
      }
    } catch (eSaveAuto) { /* une sauvegarde automatique ratee ne doit jamais bloquer la synchro */ }
    showToast('Synchronisation en cours...');
    try {
      // 13/11 (consolidation) : filet de securite global. Les appels Drive
      // (chercher/creerDossier/lireFichierDrive/envoyerFichier) sont de
      // simples fetch() sans aucun delai -- si le reseau cale en plein
      // echange, l'appel restait bloque indefiniment et le bouton restait
      // grise jusqu'a une mise a jour forcee. On borne maintenant toute la
      // synchro a un delai global, avec un message clair plutot qu'un
      // blocage muet.
      // 16/11 : la synchro traite maintenant les affaires une par une, en
      // confirmant chacune sur le Drive avant de passer a la suivante (voir
      // synchroniser() ci-dessus) -- si ce delai global est quand meme
      // depasse (beaucoup d'affaires, ou pieces jointes volumineuses), les
      // affaires deja traitees restent acquises et il suffit de relancer la
      // synchro pour reprendre sur les suivantes. Le filet est allonge a
      // 180 s pour laisser le temps a un gros lot d'affaires de passer en
      // une seule fois sur un reseau simplement lent (pas bloque).
      var DELAI_SYNCHRO = 180000;
      var b = await Promise.race([
        synchroniser(),
        new Promise(function(_, ko){
          setTimeout(function(){ ko(new Error('delai depasse (' + (DELAI_SYNCHRO / 1000) + ' s) -- reseau trop lent ou instable ; les affaires deja synchronisees sont conservees, relancez pour continuer')); }, DELAI_SYNCHRO);
        })
      ]);
      renderAffaireList(); if (typeof renderDashboard === 'function') { try { renderDashboard(); } catch (e) {} }
      // L'ecran Terrain garde l'affaire choisie dans une reference qui devient
      // perimee quand la synchro remplace tout le tableau affaires (voir
      // terrainRafraichir dans index.html) : sans ca, un sous-traitant ajoute
      // sur l'autre appareil n'apparaissait jamais dans la liste Terrain.
      if (typeof terrainRafraichir === 'function') { try { terrainRafraichir(); } catch (e) {} }
      // 16/11 (bug remonte par Alain : "6 pieces recues" annonce par le
      // toast, mais rien de visible a l'ecran) : la grille "Documents" de
      // l'affaire actuellement ouverte n'etait jamais rafraichie apres une
      // synchro -- les pieces arrivaient bien dans affaires[], mais l'ecran
      // affiche restait sur l'ancien contenu tant qu'on ne changeait pas de
      // page. Meme garde que partout ailleurs (ne force rien si la grille
      // n'est pas affichee).
      try { if (document.getElementById('docs-grid') && document.getElementById('docs-grid').innerHTML) renderDocsGrid(); } catch (eDG) {}
      etat('');
      // 13/11 (consolidation) : l'indicateur du header reflete maintenant la
      // vraie synchro Drive -- vert "Synchronise" juste apres, avec la date
      // en infobulle (cf. majSyncIndic dans index.html).
      if (typeof majSyncIndic === 'function') { try { majSyncIndic('synced'); } catch (e) {} }
      // 16/11 : une ou plusieurs pieces jointes en echec (reseau instable,
      // meme apres reprise) n'empechent plus le reste de la synchro --
      // signalees ici plutot que de faire echouer tout le bilan.
      showToast('Synchronisé : ' + b.recues + ' affaire(s) reçue(s) ou mise(s) à jour, ' + b.envoyees + ' envoyée(s) ; fichiers : '
        + b.fichiersEnvoyes + ' envoyé(s), ' + b.fichiersRecus + ' reçu(s)' + (b.nettoyes ? ', ' + b.nettoyes + ' retiré(s) du Drive' : '')
        + (b.erreursFichiers.length ? ' ; ' + b.erreursFichiers.length + ' piece(s) en echec (reessayez) : ' + b.erreursFichiers.slice(0, 2).join(' ; ') : ''),
        b.erreursFichiers.length ? 'error' : 'success');
    } catch (e) {
      etat(''); showToast('Synchronisation impossible : ' + e.message, 'error');
    }
    if (btn) btn.disabled = false;
  };
  window.CSPS17Sync = { appareil: appareil };
})();

// ============================================================================
// SAUVEGARDE / IMPORT VIA UN DOSSIER LOCAL (16/11, demande d'Alain) : en plus
// du relais Google Drive (qui synchronise PC <-> tablette), CSPS17 peut aussi
// lire/ecrire directement dans une arborescence de dossiers Windows/Android
// du type <racine>/<Client (MOA)>/<Affaire>/ -- celle qu'Alain tient deja a
// la main sur son PC (C:\...\coordosps17\Chantier Chausson\AURAY, ...).
// Objectif d'Alain : une sauvegarde lisible sans l'appli, et la possibilite
// de travailler meme sans reseau (ce dossier ne passe pas par Drive).
// Repose sur l'API File System Access -- Chrome PC et Chrome Android
// uniquement (pas Safari/iPad, verifie avec Alain avant de construire).
// Fichiers de meme nom rencontres plusieurs fois dans le dossier : on ne
// garde que le plus recent (demande expresse d'Alain).
// ============================================================================
(function(){
  var DBN = 'csps17-config', ST = 'kv', dbp = null;
  function baseCfg(){
    if (dbp) return dbp;
    dbp = new Promise(function(ok, ko){
      var r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = function(){ r.result.createObjectStore(ST); };
      r.onsuccess = function(){ ok(r.result); }; r.onerror = function(){ ko(r.error); };
    });
    return dbp;
  }
  function cfgOp(mode, fn){
    return baseCfg().then(function(d){ return new Promise(function(ok, ko){
      var t = d.transaction(ST, mode), s = t.objectStore(ST), res;
      var q = fn(s); if (q) q.onsuccess = function(){ res = q.result; };
      t.oncomplete = function(){ ok(res); }; t.onerror = function(){ ko(t.error); };
    }); });
  }
  var racineHandle = null; // handle garde en memoire pour la session en cours

  function normNom(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  // Rapprochement souple entre un nom de dossier et moa.nom/chantier.nom :
  // "auray" <-> "chausson materiaux auray", "st mars la briere" <-> "st-mars-
  // la-briere"... un mot de 4 lettres ou plus en commun suffit.
  function nomsProches(a, b) {
    var na = normNom(a), nb = normNom(b);
    if (!na || !nb) return false;
    if (na.indexOf(nb) >= 0 || nb.indexOf(na) >= 0) return true;
    var motsA = na.split(' ').filter(function(m){ return m.length >= 4; });
    var motsB = nb.split(' ').filter(function(m){ return m.length >= 4; });
    return motsA.some(function(m){ return nb.indexOf(m) >= 0; }) || motsB.some(function(m){ return na.indexOf(m) >= 0; });
  }

  function majStatutDossierLocal(texte) {
    var el = document.getElementById('dossier-local-etat');
    if (el) el.textContent = texte || '';
  }

  async function obtenirPermission(handle) {
    var opts = { mode: 'readwrite' };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if ((await handle.requestPermission(opts)) === 'granted') return true;
    return false;
  }

  window.choisirDossierLocal = async function() {
    if (!window.showDirectoryPicker) {
      showToast('Ce navigateur ne permet pas l\'acces direct a un dossier (Chrome PC ou Android uniquement, pas Safari/iPad)', 'error');
      return;
    }
    try {
      var h = await window.showDirectoryPicker({ id: 'csps17-dossier-local', mode: 'readwrite' });
      racineHandle = h;
      await cfgOp('readwrite', function(s){ return s.put(h, 'racineDossierLocal'); });
      majStatutDossierLocal('Dossier local : ' + h.name);
      showToast('Dossier local relie : ' + h.name, 'success');
    } catch (e) { if (e && e.name !== 'AbortError') showToast('Impossible d\'ouvrir le dossier : ' + e.message, 'error'); }
  };

  async function recupererRacine() {
    if (racineHandle) return racineHandle;
    try {
      var h = await cfgOp('readonly', function(s){ return s.get('racineDossierLocal'); });
      if (h) racineHandle = h;
      return h || null;
    } catch (e) { return null; }
  }

  // Nettoie un nom pour en faire un nom de dossier valide (Windows interdit
  // en plus certains caracteres un nom qui se termine par un espace ou un
  // point).
  function sanitizeNomDossier(s) {
    var n = String(s || '').replace(/[\\/:*?"<>|]/g, '-').trim().replace(/[.\s]+$/, '');
    // Designation du chantier parfois tres longue (80+ caracteres) -- on
    // tronque pour rester raisonnable (chemins Windows limites) sans perdre
    // la partie la plus identifiante (le debut).
    return (n ? n.slice(0, 60).trim() : '') || 'sans-nom';
  }

  // Cherche (ou cree) le sous-dossier <client>/<affaire> correspondant a
  // l'affaire -- ne cree que si rien n'approche (cas de la tablette, ou rien
  // n'existe encore la premiere fois).
  // 16/11 (bug releve par Alain : sur la tablette, seule l'affaire dont le
  // MOA etait rempli avait eu son dossier cree) : quand le champ Maitre
  // d'Ouvrage est encore vide, on ne doit pas abandonner silencieusement --
  // on range alors l'affaire directement a la racine, par son nom de
  // chantier (a deplacer a la main sous le bon client une fois le MOA
  // complete).
  async function dossierAffaire(racine, affaire, creer) {
    var nomClient = (affaire.moa && affaire.moa.nom) || '';
    var nomAffaire = (affaire.chantier && affaire.chantier.nom) || '';
    if (!nomClient && !nomAffaire) return null;
    if (!nomClient) {
      var direct = null;
      for await (var [nomR, entryR] of racine.entries()) {
        if (entryR.kind === 'directory' && nomsProches(nomR, nomAffaire)) { direct = entryR; break; }
      }
      if (direct) {
        // 16/11 (bug remonte par Alain : conventions AURAY + Ploneour-Lanvern
        // + St-Mars melangees dans une seule affaire) : quand le MOA est
        // vide, "direct" peut matcher par coincidence le dossier CLIENT
        // (ex: "Chantier Chausson") plutot que le dossier de CETTE affaire,
        // simplement parce que la designation du chantier contient le nom
        // du client ("Auray CHAUSSON MATERIAUX..."). Un dossier client
        // contient plusieurs sous-dossiers d'affaires -- si c'est le cas
        // ici, on cherche un sous-dossier qui correspond mieux avant
        // d'utiliser "direct" tel quel, pour ne jamais importer (ni
        // exporter dans) tout le dossier client d'un coup.
        var sousDossiers = [];
        for await (var [nomS, entryS] of direct.entries()) {
          if (entryS.kind === 'directory') sousDossiers.push([nomS, entryS]);
        }
        if (sousDossiers.length) {
          var meilleur = null;
          for (var iS = 0; iS < sousDossiers.length; iS++) {
            if (nomsProches(sousDossiers[iS][0], nomAffaire)) { meilleur = sousDossiers[iS][1]; break; }
          }
          if (meilleur) return meilleur;
          // "direct" est un dossier a plusieurs affaires et aucune ne
          // correspond precisement a celle-ci : on abandonne plutot que de
          // tout ramener en vrac (mieux vaut ne rien importer que melanger).
          return null;
        }
        return direct;
      }
      if (!creer) return null;
      return await racine.getDirectoryHandle(sanitizeNomDossier(nomAffaire), { create: true });
    }
    var clientHandle = null;
    for await (var [nom, entry] of racine.entries()) {
      if (entry.kind !== 'directory') continue;
      if (nomsProches(nom, nomClient) || nomsProches(nom, nomAffaire)) { clientHandle = entry; break; }
    }
    if (!clientHandle) {
      if (!creer) return null;
      clientHandle = await racine.getDirectoryHandle(sanitizeNomDossier(nomClient), { create: true });
    }
    var affaireHandle = null;
    for await (var [nom2, entry2] of clientHandle.entries()) {
      if (entry2.kind !== 'directory') continue;
      if (nomsProches(nom2, nomAffaire)) { affaireHandle = entry2; break; }
    }
    if (!affaireHandle) {
      if (!creer || !nomAffaire) return null;
      affaireHandle = await clientHandle.getDirectoryHandle(sanitizeNomDossier(nomAffaire), { create: true });
    }
    return affaireHandle;
  }

  // Parcourt recursivement un dossier d'affaire (profondeur limitee) --
  // pour un meme nom de fichier rencontre plusieurs fois, ne garde que le
  // plus recent (demande d'Alain).
  async function listerFichiers(dirHandle, profondeur) {
    var parNom = {};
    async function parcourir(dir, p) {
      if (p > profondeur) return;
      for await (var [nom, entry] of dir.entries()) {
        if (entry.kind === 'file') {
          var f = await entry.getFile();
          if (!parNom[nom] || f.lastModified > parNom[nom].lastModified) parNom[nom] = f;
        } else if (entry.kind === 'directory') {
          await parcourir(entry, p + 1);
        }
      }
    }
    await parcourir(dirHandle, 0);
    return Object.keys(parNom).map(function(n){ return parNom[n]; });
  }

  // Import : meme classement par mots-cles que "Importer un dossier" (nom
  // puis contenu en secours), meme detection de doublon (via
  // deposerPieceDossier) -- en tache de fond, sans jamais interrompre pour
  // demander quoi que ce soit. Les fichiers non reconnus restent a importer
  // a la main via "Importer un dossier" (qui, lui, les signale).
  async function importerDepuisDossierLocal(affaire, dirHandle) {
    var fichiers = await listerFichiers(dirHandle, 4);
    var importes = 0;
    for (var i = 0; i < fichiers.length; i++) {
      var f = fichiers[i];
      if (normFichierClassement(f.name).indexOf('csps17_') === 0) continue;
      var ext = (/\.[a-z0-9]+$/i.exec(f.name || '') || [''])[0].toLowerCase();
      if (EXT_IGNOREES_VRAC.indexOf(ext) >= 0) continue;
      var t = deviserTypePiece(f.name);
      if (!t) {
        try { var texteRapide = await texteRapideClassement(f); t = classerTexteParContenu(texteRapide); } catch (eT) {}
      }
      if (!t) continue;
      try {
        var statut = await deposerPieceDossier(affaire, f, t, true);
        if (statut === 'ok') importes++;
      } catch (eDep) { /* un fichier en echec ne bloque pas les autres */ }
    }
    return importes;
  }

  // Export : depose a la racine du dossier de l'affaire une copie de chaque
  // piece/document deja trace au RJC et absent du dossier (meme nom de
  // fichier = deja present, pas de copie en double).
  async function exporterVersDossierLocal(affaire, dirHandle, nomsExistants) {
    var exportes = 0;
    var entries = (affaire.rjc || []).filter(function(e){ return e.fichierNom && (e.fichierPath || e.fichierData); });
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (nomsExistants[e.fichierNom]) continue;
      try {
        var d = e.fichierPath ? await FichiersLocaux.lire(e.fichierPath) : e.fichierData;
        if (!d) continue;
        var blob = dataUrlVersBlob(d);
        var fh = await dirHandle.getFileHandle(e.fichierNom, { create: true });
        var w = await fh.createWritable();
        await w.write(blob); await w.close();
        nomsExistants[e.fichierNom] = true;
        exportes++;
      } catch (eExp) { /* une piece en echec ne bloque pas les autres */ }
    }
    return exportes;
  }

  // 16/11 (Alain : "ne fonctionne plus", aucun message) : toute la fonction
  // est maintenant protegee par un filet global -- un clic sur "Dossier
  // local" doit TOUJOURS afficher quelque chose (meme une erreur), jamais
  // rester muet.
  window.synchroniserDossierLocal = async function() {
    try {
      if (!window.showDirectoryPicker) {
        showToast('Fonction indisponible sur ce navigateur (Chrome PC ou Android uniquement)', 'error');
        return;
      }
      showToast('Dossier local : verification de l\'acces...');
      var racine = await recupererRacine();
      if (!racine) { await window.choisirDossierLocal(); racine = racineHandle; }
      if (!racine) { showToast('Dossier local : aucun dossier selectionne', 'error'); return; }
      var ok = await obtenirPermission(racine);
      if (!ok) { showToast('Acces au dossier local refuse ou a reconfirmer', 'error'); return; }
      majStatutDossierLocal('Dossier local : verification en cours...');
      var bilanImport = 0, bilanExport = 0, sansDossier = 0, enErreur = [];
      for (var i = 0; i < affaires.length; i++) {
        var affaire = affaires[i];
        try {
          var dir = await dossierAffaire(racine, affaire, true);
          if (!dir) { sansDossier++; continue; }
          bilanImport += await importerDepuisDossierLocal(affaire, dir);
          var fichiers = await listerFichiers(dir, 4);
          var nomsExistants = {}; fichiers.forEach(function(f){ nomsExistants[f.name] = true; });
          bilanExport += await exporterVersDossierLocal(affaire, dir, nomsExistants);
        } catch (eAff) {
          // Suite au bug du MOA vide (deja corrige) : une affaire en echec
          // ne doit plus passer inapercue -- on la nomme dans le toast
          // final plutot que de l'avaler silencieusement.
          enErreur.push(((affaire.chantier && affaire.chantier.nom) || affaire.id) + ' (' + (eAff && eAff.message || eAff) + ')');
        }
      }
      persistAffaires();
      try { renderDocsGrid(); } catch (eR) {}
      try { renderAffaireList(); } catch (eR2) {}
      majStatutDossierLocal('Dossier local : ' + racine.name);
      showToast('Dossier local : ' + bilanImport + ' fichier(s) importe(s), ' + bilanExport + ' copie(s) deposee(s)'
        + (sansDossier ? ', ' + sansDossier + ' affaire(s) sans dossier correspondant' : '')
        + (enErreur.length ? ', echec sur : ' + enErreur.join(' ; ') : ''), enErreur.length ? 'error' : 'success');
    } catch (eGlobal) {
      try { majStatutDossierLocal(''); } catch (e2) {}
      showToast('Dossier local : erreur inattendue -- ' + (eGlobal && (eGlobal.name ? eGlobal.name + ' : ' : '') + eGlobal.message || eGlobal), 'error');
    }
  };
})();
