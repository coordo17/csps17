/* =======================================================================
   VEILLE CSPS — le controle de coherence des dossiers de CSPS17
   -----------------------------------------------------------------------
   Repond a une seule question : "qu'est-ce qui cloche dans mes dossiers ?"

   Ce fichier est FAIT POUR ETRE REGLE PAR ALAIN : les seuils sont en haut,
   en clair. Il se pose a la racine du depot csps17, a cote de index.html.

   Il fonctionne a la fois dans le navigateur (window.veilleCSPS) et dans
   Node (module.exports), pour pouvoir servir plus tard a l'envoi d'un
   bulletin quotidien par mail sans dependre de l'application ouverte.
   ======================================================================= */

(function (racine) {

  /* ------------------------ REGLAGES ------------------------ */
  var SEUILS = {
    visiteJours: 30,      // au-dela : le chantier n'a pas ete visite depuis trop longtemps
    dormantJours: 45,     // au-dela : dossier sans aucun mouvement
    dgiRappelJours: 30,   // un danger grave recent doit voir sa levee verifiee
    diuoApresJours: 60    // on ne reclame le DIUO qu'au-dela de ce delai apres le demarrage
  };

  /* ------------------------ OUTILS ------------------------ */
  function norm(x) {
    return String(x || '').toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function jours(dateStr, ref) {
    if (!dateStr) return null;
    var d = new Date(dateStr); if (isNaN(d.getTime())) return null;
    return Math.floor((ref.getTime() - d.getTime()) / 86400000);
  }
  function rjcDe(a) { return Array.isArray(a.rjc) ? a.rjc : []; }
  function entreprisesDe(a) {
    var e = a.entreprises || a.intervenants || [];
    if (!Array.isArray(e)) return [];
    return e.map(function (x) { return typeof x === 'string' ? { nom: x } : (x || {}); })
            .filter(function (x) { return x.nom; });
  }
  function nomDossier(a) {
    return (a.chantier && a.chantier.nom) || a.nom || a.num || 'dossier sans nom';
  }
  // Une entree du registre-journal correspond-elle a ce type de document ?
  function aDoc(a, codes, motsNature) {
    var C = codes.map(norm), M = (motsNature || []).map(norm);
    return rjcDe(a).some(function (e) {
      var d = norm(e.docRef), n = norm(e.nature) + ' ' + norm(e.objet);
      if (C.indexOf(d) >= 0) return true;
      return M.some(function (m) { return m && n.indexOf(m) >= 0; });
    });
  }
  // ... et pour une entreprise donnee ?
  function aDocPour(a, codes, ent) {
    var C = codes.map(norm);
    var mots = norm(ent.nom).split(' ').filter(function (w) {
      return w.length > 3 && ['sarl', 'sas', 'sasu', 'eurl', 'entreprise', 'societe', 'ets'].indexOf(w) < 0;
    });
    if (!mots.length) return true; // nom inexploitable : on ne cree pas de fausse alerte
    return rjcDe(a).some(function (e) {
      if (C.indexOf(norm(e.docRef)) < 0) return false;
      var champ = norm(e.intervenants) + ' ' + norm(e.objet) + ' ' + norm(e.fichierNom);
      return mots.some(function (m) { return champ.indexOf(m) >= 0; });
    });
  }
  function derniereDate(a, codes) {
    var C = codes.map(norm), best = null;
    rjcDe(a).forEach(function (e) {
      if (C.indexOf(norm(e.docRef)) < 0 || !e.date) return;
      var d = new Date(e.date); if (isNaN(d.getTime())) return;
      if (!best || d > best) best = d;
    });
    return best;
  }
  function texteDossier(a) {
    return norm([(a.chantier && a.chantier.nature), (a.chantier && a.chantier.nom),
      JSON.stringify(a.risques || {}), JSON.stringify(a.amiante_pgc || {})].join(' '));
  }
  function aRisquesParticuliers(a) {
    var t = texteDossier(a), r = a.risques || {};
    if (r.amiante || r.plomb || r.demolition || r.hauteur || r.terrassement || r.reseaux) return true;
    return /amiante|fibrociment|plomb|demolition|deconstruction|desamiantage|tranchee|ensevelissement/.test(t);
  }

  /* ------------------------ REGLES ------------------------ */
  /* Chaque regle recoit (a, ctx) et pousse des alertes.
     gravite : 'critique' | 'important' | 'a suivre'                        */
  var REGLES = [

    // 1. Amiante annonce mais aucun reperage au dossier
    function (a, ctx) {
      var t = texteDossier(a);
      var amiante = (a.risques && a.risques.amiante) || /amiante|fibrociment|desamiantage/.test(t);
      if (!amiante) return [];
      var raat = (a.amiante_pgc && a.amiante_pgc.raat_date) || '';
      var rapports = Array.isArray(a.rapportsAnalyses) ? a.rapportsAnalyses.length : 0;
      if (raat || rapports > 0 || aDoc(a, ['DIAG'], ['diagnostic', 'reperage', 'raat'])) return [];
      return [ctx.alerte(a, 'critique', 'Amiante annonce et AUCUN reperage au dossier',
        'Reclamer le reperage avant travaux au maitre d ouvrage avant tout demarrage (obligation MOA).')];
    },

    // 2. Entreprise sans inspection commune
    function (a, ctx) {
      return entreprisesDe(a).filter(function (e) {
        return !aDocPour(a, ['FIC'], e);
      }).map(function (e) {
        return ctx.alerte(a, 'important', 'Pas d inspection commune pour ' + e.nom,
          'Programmer l IC avant son intervention (R.4532-12) — elle conditionne son PPSPS.');
      });
    },

    // 3. Entreprise sans PPSPS analyse (quand le chantier l impose)
    function (a, ctx) {
      var cat = Number(a.cat || a.categorie || 3);
      if (cat >= 3 && !aRisquesParticuliers(a)) return [];
      return entreprisesDe(a).filter(function (e) {
        return !aDocPour(a, ['PPP'], e);
      }).map(function (e) {
        return ctx.alerte(a, 'important', 'PPSPS non analyse pour ' + e.nom,
          cat <= 2 ? 'Chantier soumis a PGC : PPSPS obligatoire, delai 30 jours (8 jours second oeuvre hors risques particuliers).'
                   : 'Travaux a risques particuliers en categorie 3 : PPSPS exigible de cette entreprise.');
      });
    },

    // 4. Visite trop ancienne
    function (a, ctx) {
      var d = derniereDate(a, ['VIS']);
      var secours = (a._visite && (a._visite.date || a._visite.dateIC)) || null;
      if (!d && secours) { var s = new Date(secours); if (!isNaN(s.getTime())) d = s; }
      if (!d) {
        if (!a.chantier || !a.chantier.debut) return [];
        var dep = jours(a.chantier.debut, ctx.aujourdhui);
        if (dep === null || dep < SEUILS.visiteJours) return [];
        return [ctx.alerte(a, 'important', 'Chantier demarre depuis ' + dep + ' jours, aucune visite enregistree',
          'Faire une visite et la consigner au registre-journal.')];
      }
      var n = jours(d.toISOString().slice(0, 10), ctx.aujourdhui);
      if (n === null || n < SEUILS.visiteJours) return [];
      return [ctx.alerte(a, 'important', 'Derniere visite il y a ' + n + ' jours',
        'Planifier une visite : au-dela de ' + SEUILS.visiteJours + ' jours la coordination n est plus tracee.')];
    },

    // 5. PGC non remis alors que le chantier a demarre
    function (a, ctx) {
      var statut = norm((a._ficData && a._ficData.pgcStatut) || '');
      if (statut === 'remis') return [];
      var cat = Number(a.cat || a.categorie || 3);
      var exige = cat <= 2 || aRisquesParticuliers(a);
      if (!exige) return [];
      var debut = a.chantier && a.chantier.debut;
      var dep = debut ? jours(debut, ctx.aujourdhui) : null;
      if (dep === null || dep < 0) return [];
      return [ctx.alerte(a, 'critique', 'Chantier demarre et PGC non remis',
        cat <= 2 ? 'PGC obligatoire en categorie ' + cat + ' : il doit etre joint au dossier de consultation.'
                 : 'Travaux a risques particuliers en categorie 3 : PGC simplifie exige (R.4532-52).')];
    },

    // 6. Danger grave imminent recent : verifier la levee
    function (a, ctx) {
      var d = derniereDate(a, ['DGI']);
      if (!d) return [];
      var n = jours(d.toISOString().slice(0, 10), ctx.aujourdhui);
      if (n === null || n > SEUILS.dgiRappelJours) return [];
      return [ctx.alerte(a, 'critique', 'Danger grave signale il y a ' + n + ' jours',
        'Verifier que la mesure a ete levee et le consigner au registre-journal.')];
    },

    // 7. DIUO absent sur un chantier avance
    function (a, ctx) {
      if (aDoc(a, ['DIUO'], ['diuo', 'intervention ulterieure'])) return [];
      var debut = a.chantier && a.chantier.debut;
      var dep = debut ? jours(debut, ctx.aujourdhui) : null;
      if (dep === null || dep < SEUILS.diuoApresJours) return [];
      return [ctx.alerte(a, 'a suivre', 'Aucun DIUO au dossier apres ' + dep + ' jours de chantier',
        'Le DIUO se constitue des la conception et se remet au maitre d ouvrage a la reception.')];
    },

    // 8. Dossier dormant
    function (a, ctx) {
      var ref = a.savedAt || null;
      var dj = derniereDate(a, ['VIS', 'FIC', 'RCO', 'OBS', 'IC', 'DGI', 'PPP', 'DIAG']);
      if (dj) { var iso = dj.toISOString(); if (!ref || iso > ref) ref = iso; }
      var n = ref ? jours(ref, ctx.aujourdhui) : null;
      if (n === null || n < SEUILS.dormantJours) return [];
      return [ctx.alerte(a, 'a suivre', 'Aucun mouvement depuis ' + n + ' jours',
        'Verifier si le chantier est termine : si oui, cloturer et remettre le DIUO.')];
    }
  ];

  /* ------------------------ MOTEUR ------------------------ */
  var ORDRE = { 'critique': 0, 'important': 1, 'a suivre': 2 };

  function veille(affaires, aujourdhui) {
    var ref = aujourdhui ? new Date(aujourdhui) : new Date();
    var liste = (affaires || []).filter(function (a) { return a && !a.archive; });
    var ctx = {
      aujourdhui: ref,
      alerte: function (a, gravite, quoi, action) {
        return { dossier: nomDossier(a), num: a.num || '', id: a.id || '', gravite: gravite, quoi: quoi, action: action };
      }
    };
    var out = [];
    liste.forEach(function (a) {
      REGLES.forEach(function (r) {
        try { out = out.concat(r(a, ctx) || []); } catch (e) { /* une regle qui casse n en bloque pas une autre */ }
      });
    });
    out.sort(function (x, y) {
      var d = ORDRE[x.gravite] - ORDRE[y.gravite];
      return d !== 0 ? d : String(x.num).localeCompare(String(y.num));
    });
    return out;
  }

  // Rendu texte court, utilisable en chat, en vocal et dans un mail
  function veilleTexte(alertes, options) {
    var o = options || {};
    if (!alertes.length) return 'Rien a signaler : tous les dossiers sont a jour.';
    var parGravite = { 'critique': [], 'important': [], 'a suivre': [] };
    alertes.forEach(function (x) { (parGravite[x.gravite] || parGravite['a suivre']).push(x); });
    var L = [];
    ['critique', 'important', 'a suivre'].forEach(function (g) {
      var arr = parGravite[g]; if (!arr.length) return;
      L.push((g === 'critique' ? 'CRITIQUE' : g === 'important' ? 'IMPORTANT' : 'A SUIVRE') + ' (' + arr.length + ')');
      arr.forEach(function (x) {
        L.push('- ' + (x.num ? x.num + ' — ' : '') + x.dossier + ' : ' + x.quoi + (o.avecAction === false ? '' : '\n  → ' + x.action));
      });
      L.push('');
    });
    return L.join('\n').trim();
  }

  var api = { veille: veille, veilleTexte: veilleTexte, SEUILS: SEUILS, _norm: norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  racine.veilleCSPS = api;

})(typeof window !== 'undefined' ? window : globalThis);
