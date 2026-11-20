# -*- coding: utf-8 -*-
import sys, io

PATH = sys.argv[1]
with io.open(PATH, encoding='utf-8') as f:
    s = f.read()

def rep1(old, new, label):
    n = s.count(old)
    if n != 1:
        raise SystemExit('ANCHOR NOT UNIQUE (%d occurrences): %s' % (n, label))
    return s.replace(old, new, 1)

# ---------------------------------------------------------------------------
# A) collectFormData() : ajouter miseEnCommun
# ---------------------------------------------------------------------------
anchor_a = "    entreprises: entreprises,\n    savedAt: new Date().toISOString(),"
new_a = "    entreprises: entreprises,\n    miseEnCommun: collecterMiseEnCommun(),\n    savedAt: new Date().toISOString(),"
s = rep1(anchor_a, new_a, 'collectFormData miseEnCommun')

# ---------------------------------------------------------------------------
# B) loadAffaire() : restaurer miseEnCommun
# ---------------------------------------------------------------------------
anchor_b = "  icApresChargementEntreprises(a.entreprises);\n"
new_b = "  icApresChargementEntreprises(a.entreprises);\n  restaurerMiseEnCommun(a.miseEnCommun);\n"
s = rep1(anchor_b, new_b, 'loadAffaire restaurerMiseEnCommun')

# ---------------------------------------------------------------------------
# C) genererPGCNatif() : ajout section 3 avant la construction du XML
# ---------------------------------------------------------------------------
anchor_c = """        alertes.forEach(function(a){ if (a) body += wLi(a); });
      }
    }

    var doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'"""
new_c = """        alertes.forEach(function(a){ if (a) body += wLi(a); });
      }
    }

    // [12/11, demande d'Alain, Etape 3 du portage PGC Harmo -> CSPS17] :
    // section 3 (categories a-g de l'article R.4532-44-3, fiches-risques par
    // metier, mise en commun des moyens). A la difference de la section 2,
    // le texte des categories a-g est repris quasi mot pour mot d'Harmo (texte
    // reglementaire fixe, valide par Alain sur plusieurs chantiers) ; seules
    // les parties qui, chez Harmo, dependent d'une lecture IA des PPSPS
    // (notamment la mise en commun des moyens) sont ici pilotees par une
    // saisie manuelle de l'affaire (cf. collecterMiseEnCommun), jamais
    // devinees -- Alain a confirme le 12/11 que CSPS17 reste sans IA, meme
    // pour la lecture de documents (la lecture IA des plans a ete retiree).
    body += corpsSection3PGCNatif(data, faits);

    var doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'"""
s = rep1(anchor_c, new_c, 'genererPGCNatif section 3 hook')

# ---------------------------------------------------------------------------
# D) Nouvelles fonctions JS, inserees juste avant genererPGCNatif
# ---------------------------------------------------------------------------
NEW_FUNCS = u'''
// [Portage PGC Etape 3 - 12/11, demande d'Alain] Mise en commun des moyens
// (PGC Harmo S3 b)) : chez Harmo, le statut (commun/propre/sans objet) de
// chaque moyen est detecte par IA a la lecture des PPSPS des entreprises.
// CSPS17 n'a pas cet import (decision du 28/09, reconfirmee par Alain le
// 12/11 : meme la lecture IA des plans a ete retiree, CSPS17 reste sans IA
// de bout en bout) -- saisie manuelle ici, un select par moyen dans la fiche
// affaire (onglet Intervenants) : rien n'est devine, un moyen laisse "non
// renseigne" n'apparait simplement pas dans le PGC genere.
var MEC_MOYENS = [
  ['echafaudage', 'Échafaudage'],
  ['grue', 'Grue à tour ou équivalent'],
  ['levageVertical', 'Levage vertical (hors grue)'],
  ['manutentionHorizontale', 'Manutention horizontale'],
  ['installationElectrique', 'Installation électrique provisoire (TGBT)'],
  ['eclairage', 'Éclairage de chantier'],
  ['espaceConfine', 'Espaces confinés — ventilation'],
  ['eau', 'Alimentation en eau']
];
function collecterMiseEnCommun() {
  var mec = {};
  MEC_MOYENS.forEach(function(m){
    var k = m[0];
    var elS = document.getElementById('mec-'+k+'-statut');
    var statut = elS ? elS.value : '';
    if (!statut) return; // rien saisi : le moyen n'existe pas pour ce PGC
    var elM = document.getElementById('mec-'+k+'-mettant');
    var elB = document.getElementById('mec-'+k+'-benef');
    mec[k] = { statut: statut, mettant: elM ? elM.value : '', beneficiant: elB ? elB.value : '' };
  });
  return mec;
}
function restaurerMiseEnCommun(mec) {
  mec = mec || {};
  MEC_MOYENS.forEach(function(m){
    var k = m[0];
    var it = mec[k] || {};
    var elS = document.getElementById('mec-'+k+'-statut'); if (elS) elS.value = it.statut || '';
    var elM = document.getElementById('mec-'+k+'-mettant'); if (elM) elM.value = it.mettant || '';
    var elB = document.getElementById('mec-'+k+'-benef'); if (elB) elB.value = it.beneficiant || '';
  });
}

// [Portage PGC Etape 3 - 12/11] Fiches-risques par metier pour la section 3
// du PGC : reprend IC_METIERS_RISQUES (deja porte le 30/09 pour la fiche IC,
// section 7D), filtre sur la gravite (G>=4, meme seuil que calculerLignesRisquesMetiersPGC
// d'Harmo -- seuls les risques les plus graves figurent dans le PGC, le detail
// complet toutes gravites reste dans l'inspection commune de chaque entreprise).
// Detection du metier par lot/nom d'entreprise (icMetiersDuLot, meme principe
// que le bouton "Proposer les risques du lot" de la fiche IC), pas par texte
// libre "nature des travaux" comme Harmo : CSPS17 a une vraie liste de lots/
// entreprises saisie, Harmo s'appuyait sur un texte libre faute de mieux.
function calculerLignesRisquesMetiersPGCNatif(entreprises, faits) {
  var dejaVu = {};
  var lignes = [];
  var am = (faits && faits.amiante) || {}, pb = (faits && faits.plomb) || {};
  (entreprises || []).forEach(function(e){
    if (!e || !e.nom) return;
    var texteLot = (e.lot || '') + ' ' + (e.nom || '');
    icMetiersDuLot(texteLot).forEach(function(k){
      var info = IC_METIERS_RISQUES[k];
      if (!info) return;
      (info.risques || []).forEach(function(r){
        if (!r.g || r.g < 4) return;
        var cle = k + '|' + r.sit;
        if (dejaVu[cle]) return; // deja porte par un autre lot du meme corps de metier
        dejaVu[cle] = true;
        var mes = r.mes;
        var mentionneAmiante = /amiante/i.test((r.sit || '') + ' ' + (r.risk || ''));
        var mentionnePlomb = /plomb|saturnisme/i.test((r.sit || '') + ' ' + (r.risk || ''));
        if (mentionneAmiante && am.source) {
          mes += am.presence
            ? ' Amiante confirmée sur ce chantier par le diagnostic joint — voir localisation en section 2.'
            : ' Aucun amiante détecté par le diagnostic joint pour ce chantier — en cas de découverte fortuite, procédure d\\'arrêt immédiat applicable.';
        }
        if (mentionnePlomb && pb.source) {
          mes += pb.presence
            ? ' Plomb confirmé sur ce chantier par le diagnostic joint — voir localisation en section 2.'
            : ' Les résultats du diagnostic joint ne mettent pas en évidence de concentration de plomb supérieure au seuil réglementaire pour ce chantier.';
        }
        lignes.push([icTexteHarmo(info.label) + ' (' + (e.lot || e.nom) + ')', icTexteHarmo(r.sit), icTexteHarmo(mes)]);
      });
    });
  });
  return lignes;
}

// [Portage PGC Etape 3 - 12/11] Rendu d'une categorie a-g de l'article
// R.4532-44-3deg, repris de _blocCategorieRisque d'Harmo (tableau fusionne a
// 4 colonnes, demande d'Alain le 28/10 chez Harmo) -- ici sans les colonnes
// mettant/beneficiant par categorie (CSPS17 n'a pas cette donnee fine par
// categorie, seulement pour la mise en commun des moyens en b)).
function _blocCategorieRisqueNatif(b, lettre, titre, paragraphes, mettant, beneficiant) {
  b += wH2((lettre ? lettre + ') ' : '') + titre);
  var mettantAff = mettant || '', beneficiantAff = beneficiant || '';
  var RE_TITRE_MESURE_PGC = /^([^:]{3,70}?)\\s*:\\s*/;
  var lignes = (paragraphes || []).filter(Boolean).map(function(p){
    var texteRestant = p, titreMesure = '';
    var m = RE_TITRE_MESURE_PGC.exec(texteRestant);
    if (m) { titreMesure = m[1]; texteRestant = texteRestant.slice(m[0].length); }
    return [{text: titreMesure || '—', b: true}, {text: texteRestant}, mettantAff || '—', beneficiantAff || '—'];
  });
  if (lignes.length) {
    b += wTable(['Mesures de prévention', 'Sujétions du coordonnateur à respecter par les entreprises', 'Entreprise mettant en œuvre', 'Entreprise(s) bénéficiant'], lignes, [1800, 4800, 1200, 1200]);
  }
  b += wP(' ', {sz:6});
  return b;
}

// [Portage PGC Etape 3 - 12/11] Tableau "Mise en commun des moyens", repris
// de _tableauMiseEnCommun d'Harmo mais simplifie : pas de distinction
// statut-choisi / statut-infere-par-IA (CSPS17 n'infere rien, tout est saisi
// par Alain) -- chaque moyen renseigne va dans le tableau, aucun regroupement
// ni aucune omission silencieuse.
function _tableauMiseEnCommunNatif(mec) {
  mec = mec || {};
  var labels = {};
  MEC_MOYENS.forEach(function(m){ labels[m[0]] = m[1]; });
  var moyens = MEC_MOYENS.filter(function(m){ return mec[m[0]] && mec[m[0]].statut; });
  if (!moyens.length) return '';
  var b = wP('Mise en commun des moyens (R.4532-44, 3°)', {b:true, sz:19, spacing:40});
  function modalite(it) {
    if (it.statut === 'commun') return 'Mis en commun — mise en œuvre : ' + (it.mettant || '—') + ' ; bénéficiaire(s) : ' + (it.beneficiant || '—');
    if (it.statut === 'sansobjet') return 'Sans objet pour ce chantier.';
    if (it.statut === 'adefinir') return 'À définir en phase de préparation de chantier, en concertation avec le coordonnateur SPS.';
    return 'Chaque entreprise met en œuvre et entretient son propre matériel — aucune mutualisation prévue à ce jour.';
  }
  var lignes = moyens.map(function(m){ return [labels[m[0]], modalite(mec[m[0]])]; });
  b += wTable(['Moyen', 'Modalité retenue'], lignes, [3200, 5800]);
  return b;
}

// [Portage PGC Etape 3 - 12/11, demande d'Alain : "meme mise en page" que
// Harmo] Section 3 complete du PGC : categories a-g de l'article
// R.4532-44-3deg (texte reglementaire repris quasi mot pour mot d'Harmo),
// sujetions demolition/desamiantage/reseaux/cloture (detectees depuis les
// lots et les fiches de faits deja saisies, jamais depuis un import PPSPS),
// mise en commun des moyens (saisie manuelle, cf. ci-dessus) et fiches-
// risques par metier (IC_METIERS_RISQUES, deja porte le 30/09). Ce que
// Harmo tire d'une lecture CBT/PPSPS par IA (clauses reseaux/toiture
// litterales, tableau de chevauchements, sous-parties "type de travaux
// specifique" par mots-cles CBT) n'est pas repris ici : CSPS17 n'a pas ces
// documents importes -- seules des phrases generiques, jamais d'affirmation
// non verifiee, remplacent ces passages. Lacune connue, cf.
// plan_portage_pgc_harmo_vers_csps17.md (projet Harmo).
function corpsSection3PGCNatif(data, faits) {
  faits = faits || {};
  var entreprises = (data.entreprises || []).filter(function(e){ return e && e.nom; });
  var mec = data.miseEnCommun || {};
  var am = faits.amiante || {}, pb = faits.plomb || {};
  var b = '';
  b += wH('3. Mesures de coordination (R.4532-44, 3°)');

  if (!entreprises.some(function(e){ return e.dateInterv; })) {
    b += wP('Le planning prévisionnel n\\'étant pas encore établi, les mesures liées au phasage et aux interfaces entre entreprises (ordre d\\'intervention, coactivité, enchaînements de tâches entre lots) seront complétées dès sa communication, notamment en réunion de préparation de chantier.', {sz:18, spacing:80, color:'92400e'});
  }

  // Sujétions démolition / désamiantage (detection par lot/nom d'entreprise)
  var lotDemolition = entreprises.filter(function(e){ return icMetiersDuLot((e.lot || '') + ' ' + (e.nom || '')).indexOf('démolition_désamiantage') !== -1; });
  if (lotDemolition.length) {
    b += wH2('Sujétions particulières liées à la démolition');
    b += wP('Ce chantier comporte un lot de démolition, de déconstruction ou de désamiantage. Deux règles de coordination s\\'appliquent, quel que soit le phasage retenu :', {sz:18, spacing:40, color:'475569'});
    b += wLi('Pendant l\\'intervention de ce lot, aucune autre entreprise n\\'intervient dans le même périmètre, délimité et rendu inaccessible aux autres corps d\\'état (coactivité simultanée interdite).');
    b += wLi('À l\\'issue de l\\'intervention, le lot restitue une zone nettoyée, exempte de tout élément à risque, avant que les entreprises suivantes ne reprennent leurs travaux (coactivité successive).');
    b += wP('L\\'entreprise de démolition protège les bâtiments annexes, les constructions voisines et les autres activités du site des risques générés par ses travaux, notamment de heurt et de projection.', {sz:18, spacing:80, color:'475569'});
    b += wP('Les travailleurs ne sont employés à des hauteurs différentes que si des précautions protègent ceux qui travaillent aux niveaux inférieurs (article R.4534-64 du Code du travail).', {sz:18, spacing:80, color:'475569'});
    if (am.source && am.presence) {
      b += wH2('Sujétions particulières liées au désamiantage');
      b += wP('Vérification, avant intervention, que le périmètre d\\'investigation du diagnostiqueur couvre bien le périmètre réel des travaux.', {sz:18, spacing:80, color:'475569'});
    }
  }

  // Continuité de la clôture de chantier
  b += wH2('Continuité de la clôture de chantier');
  var pl = faits.plans || {};
  var phraseAttribution = pl.cloture ? (' Attribution relevée dans les documents du chantier : ' + pl.cloture + '.') : '';
  b += wP('La fermeture du site est maintenue sans interruption pendant toute la durée du chantier. Lorsque la responsabilité de la clôture passe d\\'un lot à un autre, une réunion de coordination entre les deux lots concernés précède le relais, afin qu\\'aucune période du chantier ne reste sans clôture.' + phraseAttribution, {sz:18, spacing:80, color:'475569'});

  // Réseaux connus + sujétions DT-DICT
  b += wH2('Réseaux connus');
  var rz = faits.reseaux || {};
  var clauseReseaux = rz.observation || 'Les documents disponibles ne permettent pas d\\'affirmer la présence ou l\\'absence de réseaux aériens ou enterrés sur l\\'emprise du chantier ; la procédure réglementaire ci-dessous s\\'applique par précaution.';
  b += wP(clauseReseaux, {sz:18, spacing:80, color:'475569'});
  var entreprisesDatees = entreprises.filter(function(e){ return e.dateInterv; }).slice().sort(function(x, y){ return (x.dateInterv || '').localeCompare(y.dateInterv || ''); });
  var premierLot = entreprisesDatees[0];
  var phraseLotReseaux = premierLot ? (' Pour ce chantier, il s\\'agit du lot ' + (premierLot.lot || premierLot.nom) + '.') : '';
  b += wH2('Sujétions liées aux réseaux aériens et enterrés');
  b += wP('Pour les réseaux enterrés, la première entreprise intervenant sur le site assure le marquage-piquetage, que les entreprises suivantes maintiennent pendant toute la durée du chantier.' + phraseLotReseaux + ' Pour les réseaux électriques, l\\'entreprise intervenante sollicite la mise hors tension (article R.4534-111 du Code du travail) ou, à défaut, matérialise les distances de sécurité réglementaires (3 m pour les réseaux de tension inférieure ou égale à 50 000 V, 5 m au-delà).', {sz:18, spacing:80, color:'475569'});

  // a) Voies et zones de déplacement ou de circulation
  b = _blocCategorieRisqueNatif(b, 'a', 'Voies et zones de déplacement ou de circulation horizontales et verticales (R.4532-44-3°-a)', [
    'Circulations sur le site occupé : utilisation des voies de circulation définies par le chef d\\'établissement selon son plan d\\'organisation et le phasage du chantier. Vitesse des véhicules et engins adaptée en permanence aux caractéristiques des voies (largeur, pente, visibilité), à la présence de piétons et aux conditions du moment.',
    'Accès aux postes de travail en hauteur : mise en œuvre de passerelles entre les éléments de construction si nécessaire. Échafaudages de pied : l\\'entreprise utilisatrice doit pouvoir justifier du bon montage par PV de conformité ou auto-contrôle ; en cas de prêt d\\'échafaudage entre entreprises, une convention est signée entre les parties, avec réception de l\\'échafaudage et étude d\\'adéquation si l\\'échafaudage est commun à plusieurs corps d\\'état. Les échelles, escabeaux et marchepieds ne sont pas des postes de travail (R.4323-63) : leur usage reste toléré à titre exceptionnel, en l\\'absence d\\'alternative collective (échafaudage, PEMP, pas-de-loup, passerelle…), pour des travaux courts et non répétitifs à risque faible.',
    'Pour l\\'accès en toiture, les accès directs par un édicule (escalier ou ascenseur) sont à privilégier. Les échelles fixes ne sont tolérées que pour des interventions exceptionnelles ne nécessitant pas de port de charges importantes (R.4323-67 et R.4323-88).'
  ]);

  // b) Manutention et levage
  var grueOuLevageMutualise = (mec.grue && mec.grue.statut === 'commun') || (mec.levageVertical && mec.levageVertical.statut === 'commun');
  var phraseInterferenceLevageB = grueOuLevageMutualise
    ? 'Interférence entre moyens de levage : un engin de levage est mutualisé sur ce chantier (voir le tableau « Mise en commun des moyens » ci-dessous pour les modalités retenues) — les vérifications des apparaux de levage sont réalisées périodiquement par l\\'entreprise qui le met en œuvre ; chaque entreprise bénéficiaire reste responsable de l\\'accrochage de sa charge et de la qualité/adéquation de ses propres apparaux.'
    : 'Interférence entre moyens de levage : aucun engin de levage, échafaudage ou moyen de manutention horizontale n\\'est mutualisé sur ce chantier (voir le tableau « Mise en commun des moyens » ci-dessous) — chaque entreprise met en œuvre et entretient son propre matériel.';
  var grueSansObjet = mec.grue && mec.grue.statut === 'sansobjet';
  var phraseGrueB = grueSansObjet
    ? 'Si une grue devait être mobilisée sur ce chantier, l\\'étude d\\'implantation ainsi que le procès-verbal de vérification sans réserve après mise en place sont transmis au coordonnateur SPS avant toute première utilisation.'
    : 'Pour l\\'implantation d\\'une grue, l\\'étude d\\'implantation ainsi que le procès-verbal de vérification sans réserve après mise en place doivent être transmis au coordonnateur SPS avant toute première utilisation.';
  b = _blocCategorieRisqueNatif(b, 'b', 'Manutention et levage (R.4532-44-3°-b)', [
    phraseInterferenceLevageB,
    'Le conducteur d\\'engin de levage doit être formé et son autorisation de conduite transmise au coordonnateur SPS. Chaque entreprise transmet au coordonnateur SPS le rapport de Vérification Générale Périodique (VGP) en cours de validité au regard de la périodicité réglementaire applicable à l\\'équipement, pour chaque engin de levage utilisé sur le chantier.',
    'Aucune activité ne se déroule sous une charge en élévation, dans une zone d\\'évolution physiquement délimitée (barriérage ou moyen équivalent) ; le transport de charge en survol est interdit hors de l\\'emprise du chantier. Pour la manutention manuelle, utilisation de moyens aidants (transpalette…), vérification du chargement, formation des salariés et limitation du poids des colis et matériaux.',
    phraseGrueB
  ]);
  b += _tableauMiseEnCommunNatif(mec);

  // c) Stockage et entreposage des matériaux dangereux
  b = _blocCategorieRisqueNatif(b, 'c', 'Stockage et entreposage des matériaux dangereux (R.4532-44-3°-c)', [
    'Emplacement interdit : dans les circulations, sur les voies d\\'accès (qui restent en permanence dégagées, sauf autorisation préalable du coordonnateur SPS et balisage), en bordure de fouilles, en crête de talus, ou hors de l\\'emprise du chantier.',
    'Zone de stockage dédiée : délimitée, clôturée et signalée (panneautage, pictogrammes) sur la nature du danger et les consignes de sécurité associées (contact avec les mains, les yeux, etc.) ; ventilation adaptée (naturelle ou mécanique) au produit entreposé, selon les instructions du fabricant ; accès restreint au personnel autorisé (cadenas, chaînes, serrures) ; évacuation des matières dangereuses sans délai ; système de lutte contre le feu compatible avec les produits entreposés (extincteur, sable, etc.) à proximité immédiate.',
    'Utilisation par l\\'opérateur : personnel formé et informé sur l\\'utilisation des matériaux et substances dangereuses ; fiche de données de sécurité (FDS) accessible et présente sur la zone de travaux.'
  ]);

  // d) Gestion des déchets et décombres
  var cbt = faits.cbt || {};
  var paragraphesDechets = [];
  if (cbt.dechets) paragraphesDechets.push('Gestion des déchets : ' + cbt.dechets);
  paragraphesDechets.push('Aucun matériau ni gravois n\\'est jeté depuis une hauteur en dehors d\\'une goulotte ou d\\'un dispositif d\\'évacuation fermé aboutissant dans une benne.');
  b = _blocCategorieRisqueNatif(b, 'd', 'Gestion des déchets et décombres (R.4532-44-3°-d)', paragraphesDechets);

  // e) Enlèvement des matériaux dangereux utilisés
  var diagAmianteE = !!(am.source && am.presence);
  var phraseAmiantePlombE = diagAmianteE
    ? 'Lorsque les diagnostics préalables (cf. « Risques préexistants et diagnostics ») signalent la présence d\\'amiante, le cadre dépend de la nature de l\\'opération (article R.4412-94 du Code du travail) : travaux de retrait ou d\\'encapsulage, y compris en démolition (sous-section 3), confiés à une entreprise certifiée (article R.4412-129), avec plan de démolition, de retrait ou d\\'encapsulage transmis au moyen de la plateforme DEMAT@MIANTE trente jours au moins avant le démarrage des travaux (article R.4412-137) ; interventions susceptibles de provoquer l\\'émission de fibres (sous-section 4), avec mode opératoire transmis avant sa première mise en œuvre (articles R.4412-145 à R.4412-148). Lorsqu\\'ils signalent la présence de plomb, l\\'entreprise intervenante évalue le risque chimique et met en œuvre les mesures de prévention adaptées avant toute intervention (articles R.4412-1 à R.4412-93, et R.4412-156 à R.4412-160 pour le plomb et ses composés, du Code du travail).'
    : 'L\\'entreprise intervenante évalue le risque chimique lié à une éventuelle présence de plomb dans l\\'existant et met en œuvre les mesures de prévention adaptées avant toute intervention (articles R.4412-1 à R.4412-93, et R.4412-156 à R.4412-160 pour le plomb et ses composés, du Code du travail).';
  var phraseEnlevementE = diagAmianteE
    ? 'Enlèvement des matériaux et produits dangereux exclusivement par une entreprise, un organisme ou un transporteur spécialisé et agréé, au moyen de bennes ou d\\'un dispositif de stockage temporaire identifié et adapté au produit concerné. Pour l\\'amiante relevant de la sous-section 3, les modalités de stockage avant évacuation sont celles fixées par le plan de démolition, de retrait ou d\\'encapsulage (PRA) transmis via DEMAT@MIANTE. Pour les déchets amiantés, un bordereau de suivi de déchets amiante (BSDA) est établi et transmis au maître d\\'ouvrage, assurant la traçabilité jusqu\\'à leur élimination.'
    : 'Enlèvement des matériaux et produits dangereux exclusivement par une entreprise, un organisme ou un transporteur spécialisé et agréé, au moyen de bennes ou d\\'un dispositif de stockage temporaire identifié et adapté au produit concerné.';
  b = _blocCategorieRisqueNatif(b, 'e', 'Enlèvement des matériaux dangereux utilisés (R.4532-44-3°-e)', [
    'Cette catégorie concerne l\\'enlèvement des matériaux et produits dangereux, qu\\'ils soient déjà présents dans l\\'existant' + (diagAmianteE ? ' (amiante, plomb…)' : ' (plomb…)') + ' ou utilisés par les entreprises (solvants, acides, etc.) — à distinguer des conditions de stockage de ces mêmes substances pendant leur utilisation (catégorie c).',
    phraseAmiantePlombE,
    'Accès à la zone concernée interdit par un balisage.',
    phraseEnlevementE
  ]);

  // f) Protections collectives, accès provisoires et installation électrique
  b = _blocCategorieRisqueNatif(b, 'f', 'Protections collectives, accès provisoires et installation électrique générale (R.4532-44-3°-f)', [
    'Chutes de hauteur en toiture : par priorité sur les équipements de protection individuelle (article R.4323-62 du Code du travail), des protections collectives sont mises en place sur les toitures (garde-corps en rives, grilles anti-chutes sous les exutoires de fumée et plaques translucides, accès sécurisé) par l\\'entreprise en charge de la couverture, ainsi qu\\'une protection contre les chutes lors de la pose. Le montage au sol des structures est privilégié avant levage.',
    'Chutes de plain-pied : pas de stockage dans les zones de circulation définies. Nettoyage des zones de travaux à la fin de chaque demi-journée.',
    'Chutes d\\'objets : étude d\\'adéquation de la résistance des platelages et zones de stockage en hauteur, avec affichage de la charge maximale admissible. Vérification de la nature et de la résistance du sol avant implantation d\\'une zone de levage ou de stockage.',
    'Ouvertures en bordure du vide : baies, trémies, trappes, passages d\\'ascenseurs et orifices de puits sont protégés par garde-corps (90 cm) et plinthe (15 cm au moins), ou par un dispositif d\\'efficacité équivalente — plancher provisoire jointif, accès interdit par un dispositif matériel (articles R.4534-4, R.4534-5 et R.4534-6 du Code du travail).',
    'Installation électrique provisoire de chantier : armoire(s) implantée(s) selon le plan d\\'installation de chantier, point de raccordement précisé par le maître d\\'ouvrage. Coffrets intermédiaires par niveau pour limiter les rallonges — aucun point du bâtiment à plus de 25 m d\\'un coffret — positionnés en hauteur, hors de toute venue d\\'eau. Câbles non posés au sol ; alimentation extérieure enterrée ou sous fourreau repéré, hors des voies de circulation d\\'engins. Éclairage permanent des circulations et escaliers protégé par disjoncteur différentiel 30 mA (l\\'éclairage des postes de travail restant à la charge de chaque entreprise). Installation contrôlée par un organisme accrédité avant mise en service et après chaque modification, PV sans réserve transmis au coordonnateur SPS ; maintenance anticipée et préventive pour éviter toute interruption de service.',
    'Isolement de zone pendant opération à risque localisé : lors de toute opération à risque localisé pour les tiers (manutention de vitrages, essais d\\'équipements motorisés, pose d\\'éléments en façade ou sur clôture), seule l\\'entreprise concernée est présente dans la zone, qui est balisée ; le balisage empêche en particulier le passage du public lorsque le site est partiellement ouvert à l\\'exploitation.',
    'Machines et outils : chaque équipement de travail est maintenu en état de conformité avec ses règles de conception et sa notice d\\'instructions (article R.4322-1 du Code du travail), muni de l\\'ensemble des protections prévues par le constructeur (carters, dispositifs d\\'arrêt d\\'urgence) et fait l\\'objet des vérifications périodiques obligatoires prévues pour la famille d\\'équipement concernée (articles R.4323-23 à R.4323-28). Les opérateurs sont formés et informés des risques propres à l\\'équipement qu\\'ils utilisent avant toute mise en œuvre (articles R.4323-1 et R.4323-2).',
    'Risque de noyade, d\\'asphyxie, en ambiance confinée ou en zone dangereuse : si un bassin d\\'infiltration ou de régulation des eaux pluviales est mis en place, ou si une intervention en espace confiné s\\'avère nécessaire, elle est déclarée au coordonnateur SPS avant son démarrage, en binôme obligatoire, avec ventilation ou apport d\\'air garantissant une atmosphère respirable (article R.4222-23 du Code du travail). Les produits susceptibles de dégager des vapeurs ou gaz inflammables sont stockés à l\\'écart ; les opérateurs sont formés aux risques spécifiques et équipés des EPI adaptés à l\\'analyse de risque réalisée.'
  ]);

  // g) Co-activité
  b += wH2('g) Mesures prises en matière d\\'interactions sur le site — co-activité (R.4532-44-3°-g)');
  var coact = faits.coactivites || [];
  var texteCoactivite = coact.length
    ? coact.map(function(c){ return c.description || c; }).filter(Boolean).join(' ')
    : 'Les interfaces et interactions entre entreprises sont organisées en réunion de préparation de chantier puis suivies tout au long du chantier en réunion de coordination (cf. Registre Journal de Coordination) ; l\\'ordre d\\'intervention et les enchaînements entre lots sont précisés au planning dès sa communication.';
  b += wP(texteCoactivite, {sz:20, spacing:120, color:'475569'});

  // Fiches-risques par métier (risques de gravité élevée, G>=4)
  var lignesMetiers = calculerLignesRisquesMetiersPGCNatif(entreprises, faits);
  if (lignesMetiers.length) {
    b += wH2('Risques spécifiques par corps de métier (gravité élevée)');
    b += wP('Risques identifiés pour les métiers présents sur ce chantier, de gravité élevée (G\\u22654) — le détail complet, toutes gravités, figure dans l\\'inspection commune de chaque entreprise.', {sz:17, spacing:60, color:'64748b'});
    b += wTable(['Métier (lot)', 'Situation / risque', 'Mesure de prévention'], lignesMetiers, [2200, 2800, 4000]);
  }

  return b;
}

'''

anchor_d = "// genererPGCNatif(ref) : ref vaut 'PGCR' (PGC complet, Cat.1-2) ou 'PGC3R'"
s = rep1(anchor_d, NEW_FUNCS + anchor_d, 'insertion des fonctions section 3')

with io.open(PATH, 'w', encoding='utf-8', newline='\n') as f:
    f.write(s)
print('OK JS inserted, new length =', len(s))
