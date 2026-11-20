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
# A) Hook lexique/sommaire/note preliminaire juste apres le titre
# ---------------------------------------------------------------------------
anchor_a = """    body += wP('Établi le : '+today,{sz:20,align:'center',spacing:200,color:'64748b'});
    body += wSep();

    body += wH2('Suivi des révisions');"""
new_a = """    body += wP('Établi le : '+today,{sz:20,align:'center',spacing:200,color:'64748b'});
    body += wSep();

    // [12/11, demande d'Alain, Etape 4 du portage PGC Harmo -> CSPS17] :
    // lexique (placeholder rempli a la fin, cf. ciblerLexiquePGCNatif),
    // sommaire et note preliminaire -- texte reglementaire fixe, repris
    // d'Harmo, dans le meme ordre (titre -> lexique -> sommaire -> note
    // preliminaire -> suivi des revisions -> section 1...).
    body += corpsLexiqueNatif();
    body += corpsTableMatieresNatif();
    body += corpsNotePreliminaireNatif();

    body += wH2('Suivi des révisions');"""
s = rep1(anchor_a, new_a, 'hook lexique/sommaire/note preliminaire')

# ---------------------------------------------------------------------------
# B) Hook section 7 + annexes + lexique final, juste avant la construction du XML
# ---------------------------------------------------------------------------
anchor_b = """    body += corpsSection3PGCNatif(data, faits);

    var doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'"""
new_b = """    body += corpsSection3PGCNatif(data, faits);

    // [12/11, demande d'Alain, Etape 4 du portage PGC Harmo -> CSPS17] :
    // section 7 (modalites de cooperation entre entreprises) et les 5
    // annexes (urgence, terrassement, sanitaires, PPSPS, designation de
    // sous-traitant), texte reglementaire fixe repris d'Harmo. Les sections
    // 4 (interferences avec activites d'exploitation), 5 (salubrite) et 6
    // (secours) d'Harmo ne sont pas encore portees (necessitent de nouveaux
    // champs dans la fiche affaire -- site en exploitation, point de
    // rassemblement, etablissement de sante le plus proche) : etape 5,
    // cf. plan_portage_pgc_harmo_vers_csps17.md (projet Harmo).
    body += corpsModalitesCooperationNatif(data, faits);
    body += corpsAnnexeUrgenceNatif(c.nom, c.adresse);
    body += corpsAnnexeTerrassementNatif();
    body += corpsAnnexeSanitairesNatif();
    body += corpsAnnexePPSPSNatif();
    body += corpsAnnexeDesignationSousTraitantNatif(c.nom);

    body = ciblerLexiquePGCNatif(body, LIGNES_LEXIQUE_PGC);

    var doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'"""
s = rep1(anchor_b, new_b, 'hook section 7 + annexes + lexique final')

# ---------------------------------------------------------------------------
# C) Nouvelles fonctions, inserees juste avant genererPGCNatif
# ---------------------------------------------------------------------------
NEW_FUNCS = u'''
// [Portage PGC Etape 4 - 12/11, demande d'Alain] Lexique des sigles : meme
// mecanisme qu'Harmo -- un placeholder est pose tres tot dans le corps du
// document (juste apres le titre), puis remplace a la toute fin par le
// tableau des sigles REELLEMENT utilises dans le document fini (recherche
// par mot entier sur le corps complet). Evite un lexique qui liste des
// sigles absents du document, ou en oublie qui y figurent.
var LIGNES_LEXIQUE_PGC = [
  ['PPSPS', "Plan Particulier de Sécurité et de Protection de la Santé"],
  ['MOA', "Maître d'Ouvrage"],
  ['MOE', "Maîtrise d'Œuvre"],
  ['CISSCT', "Collège Interentreprises de Sécurité, de Santé et des Conditions de Travail"],
  ['DIUO', "Dossier d'Intervention Ultérieure sur l'Ouvrage"],
  ['OPPBTP', "Organisme Professionnel de Prévention du Bâtiment et des Travaux Publics"],
  ['CARSAT', "Caisse d'Assurance Retraite et de la Santé Au Travail"],
  ['DREETS', "Direction Régionale de l'Économie, de l'Emploi, du Travail et des Solidarités"],
  ['DDETS', "Direction Départementale de l'Emploi, du Travail et des Solidarités"],
  ['VGP', "Vérification Générale Périodique"],
  ['CACES', "Certificat d'Aptitude à la Conduite En Sécurité"],
  ['DICT', "Déclaration d'Intention de Commencement de Travaux"],
  ['DT', "Déclaration de projet de Travaux"],
  ['FDS', "Fiche de Données de Sécurité"],
  ['EPI', "Équipement de Protection Individuelle"],
  ['CREP', "Constat de Risque d'Exposition au Plomb"],
  ['HAP', "Hydrocarbures Aromatiques Polycycliques"],
  ['CMR', "Cancérogène, Mutagène, ou toxique pour la Reproduction"],
  ['EMAP', "Escalier Métallique modulaire d'Accès Provisoire"],
  ['PEMP', "Plateforme Élévatrice Mobile de Personnel"]
];
function corpsLexiqueNatif(){
  var b = '';
  b += wH('Lexique des sigles et abréviations');
  b += '{{LEXIQUE_TABLE_PLACEHOLDER}}';
  b += wSep();
  return b;
}
function ciblerLexiquePGCNatif(bodyComplet, lignesLexique){
  var lignesUtilisees = lignesLexique.filter(function(l){
    var sigle = l[0];
    var re = new RegExp('\\\\b'+sigle.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')+'\\\\b');
    return re.test(bodyComplet);
  });
  var tableXml = lignesUtilisees.length
    ? wTable(['Sigle','Signification'], lignesUtilisees, [1500,7500])
    : '';
  return bodyComplet.replace('{{LEXIQUE_TABLE_PLACEHOLDER}}', tableXml);
}

// [Portage PGC Etape 4 - 12/11] Sommaire : limite pour l'instant aux
// sections reellement produites par CSPS17 (0, 1, 2, 3, 7 + annexes) --
// jamais de section listee qu'on ne genere pas encore (4, 5, 6 : etape 5,
// necessitent de nouveaux champs dans la fiche affaire).
function corpsTableMatieresNatif(){
  var b = '';
  b += wH('Sommaire');
  var annexes = ['1. fiche « En cas d\\'urgence »', '2. travaux de terrassement', '3. installations sanitaires', '4. cadre pour établir le PPSPS', '5. désignation de sous-traitant'];
  var sections = [
    '0. Note préliminaire',
    '1. Renseignements administratifs (R.4532-44, 1°)',
    '2. Organisation générale, diagnostics et contraintes (R.4532-44, 2°)',
    '3. Mesures de coordination (R.4532-44, 3°)',
    '7. Modalités de coopération entre les entrepreneurs, employeurs et travailleurs indépendants (R.4532-44, 7°)',
    'Annexes (' + annexes.join(', ') + ')'
  ];
  sections.forEach(function(s){ b += wLi(s); });
  b += wSep();
  return b;
}

function corpsNotePreliminaireNatif(){
  var b = '';
  b += wH('0. Note préliminaire');
  b += wP('Le PGC SPS définit des mesures destinées à prévenir les risques découlant des interventions successives ou simultanées sur le chantier. Ce document est requis pour toutes les opérations de catégories 1 ou 2. Établi dès la phase de conception de l\\'opération, il doit être tenu à jour et adapté à l\\'évolution du chantier. Il est joint aux dossiers d\\'appel d\\'offre.',{sz:20,spacing:100,color:'475569'});
  b += wP('PGC SPS : établi en concertation avec la maîtrise d\\'œuvre par le coordonnateur SPS dès le début de la phase de conception à partir des éléments recueillis sur le site de la construction ou fournis par le maître d\\'ouvrage.',{sz:20,spacing:60,color:'475569'});
  [
    'Joint au dossier de consultation des entreprises',
    'Mis à jour pendant toute la durée de l\\'opération',
    'Mis à disposition de tous les acteurs du projet',
    'Contient à la fois des préconisations techniques et organisationnelles pour prévenir les risques sur le chantier'
  ].forEach(function(x){ b += wLi(x); });
  b += wP('Pour les opérations de catégorie 3 comportant des travaux à risques particuliers, le coordonnateur SPS en rédige une version simplifiée (articles R.4532-52 et R.4532-54 du Code du travail), qui ne traite alors que des interférences pouvant être liées aux travaux dangereux prévus dans l\\'opération.',{sz:20,spacing:100,color:'475569'});

  b += wH2('Règles communes');
  b += wP('Ce document a été établi à la demande du Maître d\\'Ouvrage par le Coordonnateur Sécurité et Protection de la Santé pour répondre aux exigences de la Loi n°93-1418 du 31 décembre 1993 et son décret d\\'application n°94-1159.',{sz:20,spacing:60,color:'475569'});
  b += wP('Il est fondé sur les principes généraux de prévention :',{sz:20,spacing:40,color:'475569'});
  [
    'a) Éviter les risques',
    'b) Évaluer les risques qui ne peuvent pas être évités',
    'c) Combattre les risques à la source',
    'd) Adapter le travail à l\\'homme, en particulier en ce qui concerne la conception des postes de travail ainsi que le choix des équipements de travail et des méthodes de travail et de production, en vue notamment de limiter le travail monotone et le travail cadencé et de réduire les effets de ceux-ci sur la santé',
    'e) Tenir compte de l\\'état d\\'évolution de la technique',
    'f) Remplacer ce qui est dangereux par ce qui n\\'est pas dangereux ou par ce qui est moins dangereux',
    'g) Planifier la prévention en y intégrant, dans un ensemble cohérent, la technique, l\\'organisation du travail, les conditions de travail, les relations sociales et l\\'influence des facteurs ambiants, notamment les risques liés au harcèlement moral et au harcèlement sexuel, tels qu\\'ils sont définis aux articles L. 1152-1 et L. 1153-1, ainsi que ceux liés aux agissements sexistes définis à l\\'article L. 1142-2-1',
    'h) Prendre des mesures de protection collective en leur donnant la priorité sur les mesures de protection individuelle',
    'i) Donner les instructions appropriées aux travailleurs'
  ].forEach(function(x){ b += wLi(x); });
  b += wP('Les principes a, b, c, e, f, g et h sont applicables au maître d\\'ouvrage, au maître d\\'œuvre et au coordonnateur SPS ; les principes a, b, c, d, e, f, g, h et i sont applicables aux entrepreneurs ; les principes a, b, c, e et f sont applicables aux travailleurs indépendants.',{sz:20,spacing:100,color:'475569'});
  b += wSep();
  return b;
}

// [Portage PGC Etape 4 - 12/11] Section 7 : modalites de cooperation entre
// entreprises, texte reglementaire fixe repris d'Harmo. categorieCat1 et
// les pieces DIUO par lot sont deduits des donnees deja saisies dans
// l'affaire (data.cat, data.entreprises) ; diuoEtat/diuoDate n'ont pas
// encore de champ dans CSPS17 -- lignes simplement omises tant qu'ils
// n'existent pas (rien d'invente).
function corpsModalitesCooperationNatif(data, faits){
  var b = '';
  var categorieCat1 = (data.cat === 1 || data.cat === '1');
  b += wH('7. Modalités de coopération entre les entrepreneurs, employeurs et travailleurs indépendants (R.4532-44, 7°)');

  b += wH2('Accès au chantier');
  b += wP('Seules les personnes autorisées peuvent pénétrer sur le chantier.',{sz:20,spacing:60,color:'475569'});
  [
    'Entreprises détentrices d\\'un marché de travaux.',
    'Sous-traitant ayant reçu l\\'agrément du Maître d\\'ouvrage.',
    'Entreprise et sous-traitant travailleurs indépendants ayant visé le PGC.',
    'Entreprise ou sous-traitant, travailleurs indépendants ayant réalisé l\\'inspection commune avant intervention.'
  ].forEach(function(x){ b += wLi(x); });
  b += wP('Carte professionnelle (Carte BTP) obligatoire pour tout salarié — y compris sous-traitants, intérimaires et CDD — effectuant, dirigeant ou organisant des travaux de bâtiment ou de travaux publics sur le chantier (L.8291-1 et R.8291-1 du Code du travail).',{b:true,sz:20,spacing:60,color:'b91c1c'});
  [
    'Exclus de cette obligation : architectes, diagnostiqueurs immobiliers, métreurs, coordonnateurs SPS, chauffeurs et livreurs, géomètres-topographes et géomètres-experts.',
    'Les chauffeurs et livreurs n\\'en sont exclus que lorsqu\\'ils assurent uniquement la livraison ou l\\'enlèvement de matériels ou de marchandises : s\\'ils participent au montage ou à l\\'exécution des travaux, ils sont soumis à l\\'obligation (précision de l\\'OPPBTP).'
  ].forEach(function(x){ b += wLi(x); });

  b += wH2('Visa des observations du CSPS');
  b += wP('Le CSPS émet des observations ou notifications à l\\'issue de ces visites. Règle de fonctionnement retenue pour cette opération : sauf urgence ou délai particulier fixé par le coordonnateur, les entreprises répondent aux observations qui leur sont adressées dans un délai de 48 heures.',{sz:20,spacing:60,color:'475569'});
  b += wP('Les inspections communes sont organisées suffisamment en amont de l\\'intervention pour permettre l\\'examen des risques avant le début des travaux. Règle d\\'organisation retenue pour ce chantier : délai minimum de 15 jours entre la demande de rendez-vous et la visite in situ.',{sz:20,spacing:100,color:'475569'});

  b += wH2('Entreprises désignées par le Maître d\\'ouvrage');
  b += wP('Les entreprises devront rédiger un Plan Particulier de Sécurité et de Protection de la Santé (PPSPS). Un modèle cadre sera remis aux entreprises lors de la visite d\\'inspection commune.',{sz:20,spacing:100,color:'475569'});

  b += wH2('Sous-traitance');
  b += wP('Définition : quand une entreprise veut faire exécuter une partie des travaux prévus dans le contrat par une autre entreprise de BTP, il s\\'agit de sous-traitance. Elle est soumise à l\\'agrément du Maître de l\\'Ouvrage.',{sz:20,spacing:60,color:'475569'});
  b += wP('L\\'entreprise titulaire du marché a l\\'obligation de remettre le PGC à ses sous-traitants ainsi que son propre PPSPS.',{sz:20,spacing:60,color:'475569'});
  b += wP('Tous les sous-traitants, quel que soit leur rang, doivent se conformer au PGC et établir, après avoir rencontré le coordonnateur pour l\\'inspection commune, leur propre PPSPS.',{sz:20,spacing:100,color:'475569'});

  b += wH2('Travailleurs indépendants');
  b += wP('Les travailleurs indépendants et les employeurs exerçant directement une activité sur le chantier doivent se soumettre aux mêmes principes généraux de prévention que ceux applicables aux entreprises, conformément à l\\'article L.4535-1 du Code du travail.',{sz:20,spacing:100,color:'475569'});

  b += wH2('Travail intérimaire');
  b += wP('Les entreprises utilisant du personnel intérimaire respectent les dispositions des articles L.1251-1 et suivants du Code du travail. L\\'entreprise de travail temporaire, employeur de l\\'intérimaire, assure le suivi de son état de santé (visite d\\'information et de prévention, ou suivi individuel renforcé avec avis d\\'aptitude pour les postes qui le requièrent). L\\'entreprise utilisatrice, responsable des conditions d\\'exécution du travail (article L.1251-21), s\\'assure avant la prise de poste que ce suivi est adapté au poste, que l\\'intérimaire est en situation régulière (autorisation de travail pour les travailleurs étrangers), qu\\'il dispose des formations et autorisations requises (CACES, habilitation électrique…) et qu\\'il a reçu l\\'accueil sécurité ainsi que l\\'information sur les consignes de sécurité et d\\'hygiène du chantier. Les intérimaires affectés à des postes présentant des risques particuliers bénéficient d\\'une formation renforcée à la sécurité à la charge de l\\'entreprise utilisatrice (articles L.4142-2 et L.4154-2) ; aucun intérimaire n\\'est affecté aux travaux qui leur sont interdits (article D.4154-1).',{sz:20,spacing:100,color:'475569'});

  b += wH2('Prestataires de services et entreprises ponctuelles — obligation d\\'établir un PPSPS');
  b += wP('L\\'entreprise devra déclarer, auprès du CSPS, les prestataires de services qu\\'elle compte utiliser.',{sz:20,spacing:60,color:'475569'});
  b += wP('L\\'article L.4532-9 du Code du travail soumet à l\\'obligation d\\'établir un PPSPS toute entreprise appelée à intervenir à un moment quelconque des travaux sur un chantier soumis à PGC SPS. L\\'arrêt de la Cour de cassation du 14 janvier 2025 (n°23-84.130), dont la portée a été précisée par le Questions-Réponses de la Direction générale du travail de mars 2026, apporte une clarification sur la portée de ce texte : l\\'obligation vise l\\'ensemble des entreprises dont les travaux concourent à la réalisation de l\\'opération de construction, quel que soit leur statut contractuel (titulaire de marché, sous-traitant, prestataire de services), et non les seules entreprises participant directement à l\\'acte de construire.',{sz:20,spacing:60,color:'475569'});
  b += wP('Sont concernées (obligation d\\'établir un PPSPS) :',{sz:20,spacing:40,color:'475569'});
  [
    'Les entreprises effectuant des actions techniques sur le chantier impliquant une intervention directe sur l\\'ouvrage, sur ses équipements, sur ses installations provisoires ou sur les moyens nécessaires à sa réalisation (modification, mise en œuvre, réglage, assemblage, fixation, mise en service) ;',
    'Les interventions techniques portant sur les moyens ou équipements mis en œuvre pour la réalisation ou la sécurisation des travaux (installation, maintenance, réglage, réparation ou essais d\\'équipements de chantier indispensables à l\\'exécution des travaux, aux dispositifs de sécurité collective, aux essais et mises en service d\\'équipements de l\\'ouvrage avant réception).'
  ].forEach(function(x){ b += wLi(x); });
  b += wP('Ne sont pas concernées (dispensées de PPSPS, dès lors qu\\'elles ne comportent aucune action technique sur l\\'ouvrage ou ses équipements et n\\'ont pas d\\'incidence sur le processus de réalisation) :',{sz:20,spacing:40,color:'475569'});
  [
    'Les interventions réalisées en phase de conception (études, ingénierie, missions de maîtrise d\\'œuvre) ;',
    'Les prestations intellectuelles ou de contrôle sans intervention technique sur l\\'ouvrage (bureaux de contrôle, vérifications générales périodiques sans réglage ni réparation, visites commerciales) ;',
    'Les livraisons ou enlèvements de matériaux, matériels ou équipements, sans mise en œuvre ni installation ;',
    'Les interventions se limitant à des mesures, relevés ou observations sans modification ni intervention physique sur l\\'ouvrage (relevés topographiques, mesures d\\'empoussièrement).'
  ].forEach(function(x){ b += wLi(x); });
  b += wP('Ces dernières interventions doivent relever d\\'autres dispositifs de prévention et être intégrées dans l\\'organisation générale du chantier.',{sz:20,spacing:100,color:'475569'});

  b += wH2('Inspection commune');
  b += wP('Toute entreprise titulaire ou sous-traitante doit procéder à une inspection commune avec le coordonnateur SPS puis à l\\'élaboration de son PPSPS avant d\\'intervenir sur le chantier.',{sz:20,spacing:60,color:'475569'});
  b += wP('Important : si le coordonnateur constate qu\\'une entreprise n\\'a pas effectué l\\'inspection commune, il demandera au Maître d\\'ouvrage de reporter l\\'intervention de celle-ci tant que la situation ne sera pas régularisée (visite et remise du PPSPS).',{b:true,sz:20,spacing:100,color:'C07000'});

  b += wH2('Le PPSPS');
  b += wP('Rôle : le PPSPS participe à la prévention des risques (remplace l\\'ancien PHS). Il s\\'agit essentiellement pour les dirigeants des entreprises, les responsables de chantier et les divers intervenants de procéder à une analyse des travaux prévus et d\\'en déterminer les risques encourus afin d\\'aider à pallier les dangers en prenant conscience et en faisant prendre conscience de ces risques aux salariés.',{sz:20,spacing:60,color:'475569'});
  b += wP('Établissement : le titulaire dispose d\\'un délai de trente jours à compter de la réception du contrat signé par le maître d\\'ouvrage pour établir son PPSPS (article R.4532-56 du Code du travail). Le sous-traitant dispose du même délai de trente jours à compter de la réception du contrat signé par l\\'entrepreneur, réduit à huit jours pour les travaux de second œuvre ne figurant pas sur la liste des travaux à risques particuliers de l\\'article L.4532-8 (article R.4532-62 du Code du travail). Le PPSPS de chaque entreprise est disponible en permanence sur le chantier. Il est souhaitable que ces PPSPS soient regroupés avec le PGC et les observations du coordonnateur dans ce qui compose une sorte de registre de chantier. L\\'entreprise conserve son PPSPS 5 ans à compter de la réception de l\\'ouvrage.',{sz:20,spacing:60,color:'475569'});
  b += wP('Le fait pour l\\'entrepreneur de ne pas remettre son PPSPS au maître d\\'ouvrage ou au coordonnateur est puni d\\'une amende de 9 000 euros ; la récidive est punie d\\'un emprisonnement d\\'un an et d\\'une amende de 15 000 euros, la juridiction pouvant en outre prononcer les peines prévues à l\\'article L.4741-5 (article L.4744-5 du Code du travail).',{b:true,sz:20,spacing:60,color:'b91c1c'});
  b += wP('Le PPSPS s\\'appuie notamment sur : le PGC, les PPSPS des entreprises présentes sur le chantier et particulièrement celui de l\\'entreprise gros œuvre ou du lot principal, ainsi que l\\'inspection commune faite avec le coordonnateur en début de chantier, qui apporte également des informations sur les dangers particuliers au chantier.',{sz:20,spacing:60,color:'475569'});
  b += wP('Il peut être consulté par (article R.4532-73 du Code du travail) :',{sz:20,spacing:40,color:'475569'});
  [
    'L\\'inspecteur du travail ;',
    (categorieCat1 ? 'Les membres du CISSCT ;' : null),
    'Les membres du CSE de l\\'entreprise ;',
    'Le médecin du travail ;',
    'Les agents de l\\'OPPBTP ;',
    'Le service de prévention de la CARSAT.'
  ].filter(Boolean).forEach(function(x){ b += wLi(x); });
  b += wP('Le PPSPS de l\\'entreprise devra impérativement mentionner (article R.4532-64 du Code du travail) :',{b:true,sz:20,spacing:40});
  [
    'Les risques importés : risques générés par l\\'activité des autres entreprises, le chantier ou son environnement, pouvant avoir une incidence sur la santé et la sécurité de ses travailleurs ;',
    'Les risques exportés : risques générés par son activité sur les autres intervenants, notamment les travaux comportant des risques particuliers (article L.4532-8), en fonction du planning réel de l\\'opération ;',
    'Les risques propres : risques générés par son activité pour ses propres salariés — ces trois catégories de mesures étant distinguées dans le PPSPS (article R.4532-64 du Code du travail).'
  ].forEach(function(x){ b += wLi(x); });

  b += wH2('Personnels et fournisseurs');
  b += wP('Seules les personnes travaillant pour le Maître d\\'ouvrage, les entrepreneurs titulaires d\\'un marché, les sous-traitants et les travailleurs indépendants connus sont autorisés à entrer sur le site.',{sz:20,spacing:60,color:'475569'});
  b += wP('Contrôle : le coordonnateur SPS prend les dispositions nécessaires pour que seules les personnes autorisées puissent accéder au chantier (article R.4532-16 du Code du travail). En pratique, la liste des personnes habilitées à intervenir est établie par chaque entreprise et transmise au coordonnateur SPS à l\\'occasion de la remise de son PPSPS.',{sz:20,spacing:60,color:'475569'});
  b += wP('Agrément sous-traitants : copie de l\\'agrément du Maître d\\'ouvrage est transmise au coordonnateur SPS dès l\\'obtention.',{sz:20,spacing:100,color:'475569'});
  b += wH2('Dossier d\\'intervention ultérieure sur l\\'ouvrage (DIUO)');
  (function(){
    var PIECES_DIUO = [
      {re:/electri/, txt:'dossier technique des installations électriques et notice des niveaux minimum d\\'éclairement (articles R.4211-3 et R.4213-4)'},
      {re:/ventil|vmc|clim|chauffage|cvc/, txt:'notice des installations de ventilation et d\\'assainissement : entretien, contrôle d\\'efficacité, consigne d\\'utilisation (articles R.4211-3 et R.4212-7)'},
      {re:/charpente|couverture|bardage|etancheite|toiture/, txt:'dispositions d\\'accès en couverture : moyens d\\'arrimage, possibilités de garde-corps ou de filets, chemins de circulation, avec leurs notices (article R.4211-3, 2°)'},
      {re:/miroiterie|vitr|menuiserie/, txt:'dispositions pour le nettoyage des surfaces vitrées en élévation et en toiture (articles R.4211-3, 1° et R.4214-2)'},
      {re:/facade|ravalement|bardage|enseigne/, txt:'moyens d\\'arrimage et de stabilité d\\'échafaudage ou de nacelle pour l\\'entretien des façades (article R.4211-3, 3°)'},
      {re:/portail/, txt:'dossier de maintenance des portes et portails automatiques : caractéristiques, entretien, périodicité des vérifications (arrêté du 21 décembre 1993, article 8)'},
      {re:/ascenseur|monte-charge/, txt:'dispositions d\\'accès aux machineries (article R.4211-3, 4°)'},
      {re:/rayonnage|cantilever|rack|redstock|palettier/, txt:'notice de montage et charges admissibles des rayonnages, notes techniques de nature à faciliter l\\'intervention ultérieure (article R.4532-95)'}
    ];
    function normLotDIUO(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,''); }
    var nomsLots = [];
    (data.entreprises || []).forEach(function(e){ if (e && e.lot && nomsLots.indexOf(e.lot) < 0) nomsLots.push(e.lot); });
    var lignesPieces = [];
    PIECES_DIUO.forEach(function(p){
      var concernes = nomsLots.filter(function(n){ return p.re.test(normLotDIUO(n)); });
      if(concernes.length) lignesPieces.push(concernes.join(' / ')+' : '+p.txt+' ;');
    });
    b += wP('Chaque entreprise remet au coordonnateur SPS, avant la réception, les documents relevant de son lot nécessaires au DIUO (article R.4532-95)'+(lignesPieces.length ? ', notamment pour cette opération :' : '.'),{b:true,sz:20,spacing:60});
    lignesPieces.forEach(function(x){ b += wLi(x); });
  })();
  b += wSep();
  return b;
}

// [Portage PGC Etape 4 - 12/11] Annexe 1 : fiche "En cas d'urgence" (modele
// OPPBTP), a afficher en base-vie. Point de rassemblement / etablissement
// de sante le plus proche n'ont pas encore de champ dans CSPS17 (etape 5) :
// lignes laissees vides pour completion manuelle, comme le fait deja Harmo
// sur un chantier ou ces champs ne sont pas remplis -- jamais invente.
function corpsAnnexeUrgenceNatif(nomChantier, adresseChantier){
  var b = '';
  b += wH('Annexe 1 — Fiche \\'En cas d\\'urgence\\' (modèle OPPBTP)');
  b += wP('EN CAS D\\'URGENCE', {b:true,sz:64,color:'C00000',align:'center',title:true,spacing:80});
  b += wP('À compléter et afficher visiblement en base-vie. Rassembler ces informations avant d\\'appeler les secours.',{sz:18,spacing:80,color:'64748b',align:'center'});
  b += wH2('1. La nature de l\\'urgence');
  b += wP('Décrire les circonstances et les risques possibles : nature de l\\'accident (chute, ensevelissement, heurt, électrisation...), difficultés d\\'accès et de dégagement, nombre de victimes et leur état, intervention éventuelle d\\'un secouriste.',{sz:18,spacing:80,color:'475569'});
  b += wH2('2. Informations du chantier');
  b += wFL('Nom du chantier', nomChantier || '');
  b += wFL('Adresse', adresseChantier || '');
  b += wFL('Point(s) de rassemblement', '');
  b += wFL('Établissement de santé le plus proche', '');
  b += wH2('3. L\\'appel des secours');
  b += _wTableNumerosUrgenceNatif();
  b += wP('Donner les circonstances de l\\'urgence et les risques possibles, les difficultés d\\'accès et de dégagement, le nombre de victimes et leur état, l\\'intervention éventuelle d\\'un secouriste. Écouter les consignes du centre d\\'appel d\\'urgence : ne jamais raccrocher le premier. Désigner, si possible, une personne postée à un point visible pour guider rapidement les secours jusqu\\'à la victime.',{sz:18,spacing:100,color:'475569'});
  b += wSep();
  return b;
}
function _wNumeroUrgenceNatif(numero, label){
  return '<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>'
    + '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="C00000"/><w:sz w:val="56"/></w:rPr><w:t>'+escX(numero)+'</w:t></w:r></w:p>'
    + '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">'+escX(label)+'</w:t></w:r></w:p>'
    + '</w:tc>';
}
function _wTableNumerosUrgenceNatif(){
  var cols = [['15','SAMU'],['18','POMPIERS'],['17','POLICE SECOURS'],['112','CENTRE D\\'APPELS EUROPÉEN']];
  return '<w:tbl><w:tblPr><w:tblW w:w="9600" w:type="dxa"/><w:tblBorders>'
    + '<w:top w:val="none" w:sz="0" w:color="auto"/><w:left w:val="none" w:sz="0" w:color="auto"/>'
    + '<w:bottom w:val="none" w:sz="0" w:color="auto"/><w:right w:val="none" w:sz="0" w:color="auto"/>'
    + '<w:insideH w:val="none" w:sz="0" w:color="auto"/><w:insideV w:val="none" w:sz="0" w:color="auto"/>'
    + '</w:tblBorders></w:tblPr><w:tblGrid>'+cols.map(function(){ return '<w:gridCol w:w="2400"/>'; }).join('')
    + '</w:tblGrid><w:tr>'+cols.map(function(c){ return _wNumeroUrgenceNatif(c[0],c[1]); }).join('')+'</w:tr></w:tbl>'+wP(' ',{sz:8});
}

// [Portage PGC Etape 4 - 12/11] Annexe 2 : terrassement a ciel ouvert --
// tableau condense article -> obligation -> mesure, texte reglementaire
// fixe (R.4534-22 a R.4534-39), identique quel que soit le chantier.
function corpsAnnexeTerrassementNatif(){
  var b = '';
  b += wH('Annexe 2 — Travaux de terrassement à ciel ouvert');
  b += wP('Articles R.4534-22 à R.4534-39 du Code du travail — vérifiés Légifrance. Le détail technique de mise en œuvre est développé dans le PPSPS de l\\'entreprise de terrassement.',{b:true,sz:18,spacing:60,color:'64748b'});
  var lignes = [
    ['R.4534-22','Repérage préalable : terres rapportées, réseaux enterrés, risques de pollution du sous-sol','Interrogation du service voirie/propriétaire avant travaux — à charge de l\\'entreprise'],
    ['R.4534-23','Enlever ou stabiliser tout ce qui pourrait s\\'effondrer à proximité des fouilles','À charge de l\\'entreprise, avant ouverture de la fouille'],
    ['R.4534-24','Tranchées > 1,30 m de profondeur, de largeur ≤ 2/3 de la profondeur, à parois verticales : blindage, étrésillonnement ou étaiement ; autres fouilles : parois aménagées selon la nature et l\\'état des terres ; protections avant toute descente, maintenues par temps de gel','À charge de l\\'entreprise de terrassement, formalisée dans son PPSPS'],
    ['R.4534-25','Prise en compte des surcharges (dépôts, circulation) dans le calcul du blindage','Mesure fixée par la loi — développée en PPSPS'],
    ['R.4534-26','Reprise en sous-œuvre par petites portions, blindage progressif','Mesure fixée par la loi — développée en PPSPS'],
    ['R.4534-27','Purge des crêtes et parois de tout élément instable','À charge de l\\'entreprise, en continu pendant les travaux'],
    ['R.4534-28','Étaiement/consolidation des surplombs non abattables','Mesure fixée par la loi — développée en PPSPS'],
    ['R.4534-29','Mise en place du blindage au fur et à mesure de l\\'avancement','Mesure fixée par la loi — développée en PPSPS'],
    ['R.4534-30','Hauteur du blindage ≥ profondeur de la fouille, calage après descente','Mesure fixée par la loi — développée en PPSPS'],
    ['R.4534-31','Plinthes ou blindage débordant ≥15 cm pour empêcher les chutes d\\'objets','Mesure fixée par la loi — développée en PPSPS'],
    ['R.4534-32','Berme de dépôt ≥40 cm le long des tranchées >1,30 m, tenue dégagée','Mesure fixée par la loi — développée en PPSPS'],
    ['R.4534-33','Gestion des eaux d\\'infiltration (drainage, pompage)','À charge de l\\'entreprise selon conditions du chantier'],
    ['R.4534-34','Examen du talus après pluie/gel, consolidation si besoin, traçabilité au registre','À charge de l\\'entreprise — traçabilité au registre de sécurité'],
    ['R.4534-35','Moyens d\\'évacuation rapide prévus dans les fouilles','À charge de l\\'entreprise, avant occupation de la fouille'],
    ['R.4534-36','Passage sécurisé pour franchir une tranchée >40 cm','À charge de l\\'entreprise'],
    ['R.4534-37','Retrait du blindage/étai uniquement après mesures anti-éboulement','Mesure fixée par la loi — développée en PPSPS'],
    ['R.4534-38','Abattage en sous-cave uniquement par engins mécaniques, zone interdite pendant l\\'opération','À charge de l\\'entreprise'],
    ['R.4534-39','Découverte d\\'engin explosif : arrêt immédiat, alerte des autorités','Consigne générale du chantier — cf. section urgences du PGC']
  ];
  b += wTable(['Article','Obligation essentielle','Mesure retenue'], lignes, [1300,3800,3900]);
  b += wSep();
  return b;
}

// [Portage PGC Etape 4 - 12/11] Annexe 3 : installations sanitaires --
// meme principe, texte reglementaire fixe (R.4228-1 a R.4228-25).
function corpsAnnexeSanitairesNatif(){
  var b = '';
  b += wH('Annexe 3 — Installations sanitaires (extraits du Code du travail)');
  b += wP('Articles R.4228-1 à R.4228-25 du Code du travail — vérifiés Légifrance (versions en vigueur). Le dimensionnement précis (nombre de postes, surfaces) est fixé dans les installations de chantier décrites au PGC.',{b:true,sz:18,spacing:60,color:'64748b'});
  var lignes = [
    ['R.4228-1','Mise à disposition de vestiaires, lavabos, cabinets d\\'aisance et, si besoin, douches','À charge de l\\'entreprise organisant la base-vie — voir installations de chantier'],
    ['R.4228-2','Vestiaires/lavabos dans un local séparé, isolé des zones de travail/stockage','Dimensionnement de la base-vie — voir section hygiène/base-vie du PGC'],
    ['R.4228-4','Aération et chauffage convenables des locaux vestiaires/lavabos','À charge de l\\'entreprise gestionnaire de la base-vie'],
    ['R.4228-5','Installations séparées hommes/femmes si personnel mixte','À charge de l\\'entreprise gestionnaire de la base-vie'],
    ['R.4228-6','Sièges et armoires individuelles fermant à clé, compartiment séparé si vêtements souillés','À charge de l\\'entreprise gestionnaire de la base-vie'],
    ['R.4228-19','Interdiction de prendre les repas dans les locaux de travail','Consigne générale du chantier'],
    ['R.4228-20','Alcool limité au vin/bière/cidre/poiré, sauf restriction renforcée de l\\'employeur','Consigne générale du chantier : chaque entreprise applique son règlement intérieur (interdiction totale possible et recommandée compte tenu des travaux à risque — engins, hauteur)'],
    ['R.4228-21','Interdiction d\\'accès aux lieux de travail en état d\\'ivresse','Consigne générale du chantier'],
    ['R.4228-22','Local de restauration dans les établissements d\\'au moins 50 salariés (seuil d\\'effectif calculé selon l\\'article L.130-1 du Code de la sécurité sociale)','À distinguer du pic de présence simultanée sur le chantier ; à évaluer selon l\\'effectif propre de chaque entreprise concernée'],
    ['R.4228-23','Emplacement de restauration adapté en dessous de 50 salariés','À évaluer selon l\\'effectif de l\\'entreprise concernée'],
    ['R.4228-25','Local de repos possible hors heures de repas, à défaut de local dédié','À évaluer selon l\\'organisation retenue pour ce chantier']
  ];
  b += wTable(['Article','Obligation essentielle','Mesure retenue'], lignes, [1300,3800,3900]);
  b += wSep();
  return b;
}

// [Portage PGC Etape 4 - 12/11] Annexe 4 : grille de recevabilite d'un
// PPSPS, texte fixe, jamais genere par IA.
function corpsAnnexePPSPSNatif(){
  var b = '';
  b += wH('Annexe 4 — Cadre pour établir le PPSPS');
  b += wP('Afin qu\\'un Plan Particulier de Sécurité et de Protection de la Santé (PPSPS) soit recevable par le coordonnateur SPS, il doit comporter les éléments ci-dessous. À défaut, le coordonnateur le renvoie à l\\'entreprise pour complément ; l\\'entreprise ne peut intervenir tant que le PPSPS n\\'a pas été harmonisé par le CSPS.',{sz:18,spacing:100,color:'475569'});
  b += wH2('1. Les renseignements généraux');
  [
    'Le nom et l\\'adresse de l\\'entreprise ;',
    'Les travaux à réaliser : désignation du chantier, nature du (ou des) lot(s) confié(s) à l\\'entreprise et description sommaire ;',
    'Le personnel : nom et qualité de la personne chargée de diriger l\\'exécution des travaux, évolution prévisible de l\\'effectif avec dates d\\'intervention ;',
    'Les noms et les coordonnées des entreprises sous-traitantes connues.'
  ].forEach(function(x){ b += wLi(x); });
  b += wH2('2. Les secours');
  [
    'Les consignes à observer pour assurer les premiers secours aux victimes d\\'accidents et aux malades ;',
    'Le nombre de collaborateurs sur le chantier ayant reçu l\\'instruction nécessaire pour donner les premiers secours ;',
    'Le matériel médical existant sur le chantier ;',
    'Les mesures prises pour assurer, dans les moindres délais, l\\'évacuation dans un établissement hospitalier de toute victime qui le nécessite.'
  ].forEach(function(x){ b += wLi(x); });
  b += wH2('3. L\\'hygiène');
  [
    'Les mesures prises pour améliorer l\\'hygiène des personnes et la mise à disposition des locaux destinés au personnel conformément aux indications du PGC ;',
    'Pour chacune des installations, l\\'indication de leur emplacement sur le chantier et la date de leur mise en service prévisible.'
  ].forEach(function(x){ b += wLi(x); });
  b += wH2('4. Les mesures de prévention pour prévenir les risques générés par');
  [
    'l\\'activité des autres entreprises, le chantier ou son environnement (en particulier en matière de circulations ou d\\'activités d\\'exploitation dangereuses) ;',
    'l\\'activité de l\\'entreprise sur les autres intervenants ;',
    'l\\'activité de l\\'entreprise sur ses collaborateurs.'
  ].forEach(function(x){ b += wLi(x); });
  b += wP('Ces mesures sont intégrées dans des fiches de tâches afin que les opérateurs puissent les exploiter directement sur le chantier.',{sz:18,spacing:100,color:'475569'});
  b += wSep();
  return b;
}

// [Portage PGC Etape 4 - 12/11] Annexe 5 : formulaire de designation de
// sous-traitant au coordonnateur SPS -- champs vides, a completer a la main
// (comme chez Harmo), jamais pre-rempli avec des donnees devinees.
function corpsAnnexeDesignationSousTraitantNatif(nomChantier){
  var b = '';
  b += wH('Annexe 5 — Désignation de sous-traitant au coordonnateur SPS');
  b += wP('Règle d\\'organisation propre à l\\'opération : ces informations sont adressées au coordonnateur au minimum 21 jours avant l\\'intervention prévue du sous-traitant, indépendamment des démarches effectuées auprès du maître d\\'ouvrage. Cette échéance ne se substitue pas aux délais réglementaires applicables au PPSPS.',{sz:18,spacing:100,color:'64748b'});
  b += wFL('Nom du chantier', nomChantier || '');
  b += wFL('Entreprise déclarante', '');
  b += wFL('Nom du sous-traitant', '');
  b += wFL('Adresse', '');
  b += wFL('Téléphone', '');
  b += wFL('Représenté par', '');
  b += wFL('Travaux confiés', '');
  b += wFL('Date prévisionnelle d\\'intervention', '');
  b += wFL('Durée prévisionnelle', '');
  b += wFL('Coordonnées sur site', '');
  b += wP(' ',{sz:8});
  b += wP('Fait à ________________________, le ________________________',{sz:20,spacing:100});
  b += wSep();
  return b;
}

'''

anchor_c = "// genererPGCNatif(ref) : ref vaut 'PGCR' (PGC complet, Cat.1-2) ou 'PGC3R'"
s = rep1(anchor_c, NEW_FUNCS + anchor_c, 'insertion des fonctions etape 4')

with io.open(PATH, 'w', encoding='utf-8', newline='\n') as f:
    f.write(s)
print('OK etape4 inserted, new length =', len(s))
