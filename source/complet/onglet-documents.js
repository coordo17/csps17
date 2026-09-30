  // Onglet Documents range par etapes de la mission (demande d'Alain 30/09) :
  // Conception, Realisation, puis en fin de page CISSCT et DIUO.
  // Les documents hors categorie ne sont plus affiches (moins de bruit).
  // Les analyses deja faites (diagnostics, PGC pre-rempli) restent consultables.
  if (piecesSection) piecesSection.style.display = 'none';
  function cartePiece(p){
    var entries = rjcEntriesForDoc(affaire, p.ref);
    var nb = entries.length;
    var dernierF = dernierFichierDoc(affaire, p.ref);
    var badge = nb > 0 ? '<span class="doc-badge" onclick="showHistoriqueDoc(\'' + p.ref + '\')" title="' + nb + ' piece(s) au dossier \u2014 cliquer pour l\'historique">' + nb + '</span>' : '';
    var dot = (p.ref === 'PGC' || p.ref === 'CONTRAT')
      ? '<span class="doc-dot ' + (nb > 0 ? 'ok' : 'warn') + '" title="' + (nb > 0 ? 'Present au dossier' : 'Pas encore depose') + '"></span>' : '';
    var btnTel = dernierF
      ? '<button class="btn btn-outline btn-sm" onclick="telechargerDernierDoc(\'' + p.ref + '\')" title="Derniere piece : ' + formatDateFR(dernierF.date) + '">&#11015; Telecharger</button>'
      : '<button class="btn btn-outline btn-sm" disabled title="Aucune piece deposee">&#11015; Telecharger</button>';
    var btnTexte = (p.ref === 'CONTRAINTES') ? '<button class="btn btn-outline btn-sm" onclick="saisirContraintesTexte()" title="Saisir des contraintes en texte libre">&#9998; Texte libre</button>' : '';
    return '<div class="doc-card" style="background:#f8fafc;">' + badge
      + '<div class="doc-card-top"><div class="doc-icon">' + p.icon + '</div>'
      + '<div class="doc-info"><div class="doc-title">' + p.title + dot + '</div>'
      + '<div class="doc-ref">Piece recue</div></div></div>'
      + '<div class="doc-actions">'
      + '<button class="btn btn-primary btn-sm" onclick="document.getElementById(\'piece-input-' + p.ref + '\').click()">&#128229; Deposer</button>'
      + btnTexte + btnTel + '</div></div>';
  }
  function carteDoc(doc){
    var entries = rjcEntriesForDoc(affaire, doc.ref);
    var nb = entries.length;
    var dernierF = dernierFichierDoc(affaire, doc.ref);
    var manque = analyserCompletude(doc.ref, formData, affaire);
    var badgeTitle = (doc.ref === 'RJC') ? nb + ' entree(s) au registre — cliquer pour l\'historique' : nb + ' version(s) generee(s) — cliquer pour l\'historique';
    var badge = nb > 0 ? '<span class="doc-badge" onclick="showHistoriqueDoc(\'' + doc.ref + '\')" title="' + badgeTitle + '">' + nb + '</span>' : '';
    var dot = '<span class="doc-dot ' + (manque.length ? 'warn' : 'ok') + '" title="'
      + (manque.length ? ('Manque : ' + manque.join(', ').replace(/"/g, '&quot;')) : 'Donnees completes pour ce document') + '"></span>';
    var btnTelecharger;
    if (dernierF) btnTelecharger = '<button class="btn btn-outline btn-sm" onclick="telechargerDernierDoc(\'' + doc.ref + '\')" title="Derniere version : ' + formatDateFR(dernierF.date) + '">&#11015; Telecharger</button>';
    else if (doc.ref === 'RJC') btnTelecharger = '<button class="btn btn-outline btn-sm" disabled title="Le registre se genere toujours a jour — utilisez Generer">&#11015; Telecharger</button>';
    else btnTelecharger = '<button class="btn btn-outline btn-sm" disabled title="Aucune version generee">&#11015; Telecharger</button>';
    return '<div class="doc-card">' + badge
      + '<div class="doc-card-top"><div class="doc-icon">' + doc.icon + '</div>'
      + '<div class="doc-info"><div class="doc-title">' + doc.title + dot + '</div>'
      + '<div class="doc-ref">CSPS17/' + doc.ref + '</div></div></div>'
      + '<div class="doc-actions">'
      + '<button class="btn btn-primary btn-sm" onclick="generateDocAvecCheck(\'' + doc.ref + '\')">Generer</button>'
      + '<button class="btn btn-outline btn-sm" onclick="previewDoc(\'' + doc.ref + '\')">Apercu</button>'
      + btnTelecharger
      + '<button class="btn btn-outline btn-sm" onclick="insererDocExterne(\'' + doc.ref + '\')" title="Inserer un document realise hors application (scan signe, Word rempli ailleurs...) — trace au RJC a sa date reelle">&#128206; Inserer</button>'
      + '</div></div>';
  }
  var SECTIONS = [
    { titre: 'Conception', couleur: '#1e40af', fond: '#eff6ff', pieces: ['CONTRAT', 'PGC', 'DIAG', 'CONTRAINTES', 'PLANS'], docs: ['DP', 'PGCR', 'PGC3R', 'DIF', 'PV-PC'] },
    { titre: 'R\u00e9alisation', couleur: '#166534', fond: '#f0fdf4', pieces: ['ICR', 'PLAN', 'PPSPS', 'CRMOA'], docs: ['RJC', 'FIC', 'IC', 'PPP', 'VIS', 'OBS', 'DGI', 'RCO', 'RFM'] },
    { titre: 'CISSCT', couleur: '#7c2d12', fond: '#fff7ed', pieces: [], docs: ['CISSCT-RI', 'CISSCT-CONV', 'CISSCT-CR'] },
    { titre: 'DIUO', couleur: '#4c1d95', fond: '#f5f3ff', pieces: [], docs: ['DIUO', 'PV-DIUO'] }
  ];
  var phase = (affaire && affaire.missionPhase) || '';
  var html = '';
  SECTIONS.forEach(function(sec){
    var docs = sec.docs.map(function(r){ return DOCS.find(function(d){ return d.ref === r; }); })
      .filter(function(d){ return d && d.cats.includes(currentCat); });
    var pieces = sec.pieces.map(function(r){ return PIECES_DOSSIER.find(function(p){ return p.ref === r; }); }).filter(Boolean);
    if (!docs.length && !pieces.length) return;
    var horsMission = (phase === 'conception' && sec.titre !== 'Conception') || (phase === 'realisation' && sec.titre === 'Conception');
    html += '<details ' + (horsMission ? '' : 'open') + ' style="grid-column:1/-1;border:1px solid var(--border);border-left:6px solid ' + sec.couleur + ';border-radius:8px;background:' + sec.fond + ';margin-bottom:6px;">'
      + '<summary style="cursor:pointer;padding:12px 16px;font-size:16px;font-weight:700;color:' + sec.couleur + ';">' + sec.titre
      + ' <span style="font-weight:400;font-size:12px;color:var(--text-light);">' + docs.length + ' document(s)' + (pieces.length ? ', ' + pieces.length + ' piece(s) recue(s)' : '') + (horsMission ? ' — hors de votre mission' : '') + '</span></summary>'
      + '<div class="docs-grid" style="margin:0;padding:0 12px 12px;">'
      + pieces.map(cartePiece).join('') + docs.map(carteDoc).join('')
      + (sec.titre === 'Conception' ? renderAnalyseCard(affaire) + renderPGCPrefillCard(affaire) : '')
      + '</div></details>';
  });
  grid.style.display = 'block';
  grid.innerHTML = html;
}

