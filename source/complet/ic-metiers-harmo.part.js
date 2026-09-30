// Fiches-risques par metier reprises du PGC Harmo (H_METIERS_RISQUES et H_METIER_MOTS),
// texte inchange. Regenerer avec source/outils/extraire_metiers_harmo.py.
var IC_METIER_MOTS = {
'gros_oeuvre': ['gros oeuvre','maconnerie','macon','beton arme','coffrage','ferraillage','voile beton','dallage'],
'charpente_couverture': ['charpente','couverture','couvreur','toiture','zinguerie','tuile','ardoise'],
'électricité': ['electricite','electricien','cfo','cfa','courant fort','courant faible','armoire electrique'],
'plomberie_cvc': ['plomberie','plombier','cvc','chauffage','climatisation','sanitaire','ventilation'],
'peinture': ['peinture','peintre','revetement mural','ravalement'],
'menuiserie_metallerie': ['menuiserie','menuisier','metallerie','serrurerie','serrurier','miroiterie','vitrerie','vitrier','chassis vitre'],
'terrassement_vrd': ['terrassement','vrd','reseaux divers','voirie','assainissement','tranchee'],
'démolition_désamiantage': ['demolition','deconstruction','desamiantage','curage','retrait amiante'],
'étanchéité_isolation': ['etancheite','etancheur','isolation thermique','bardage isolant'],
'second_oeuvre': ['second oeuvre','plaquiste','cloison','placo','plaque de platre','doublage','platrerie','platrier','carrelage','carreleur','faience'],
'revêtement_pvc': ['sol pvc','revetement de sol','linoleum','sol souple','decochoc'],
'plafonds_suspendus': ['plafond suspendu','faux plafond','dalle de plafond'],
'echafaudeur': ['echafaudage','echafaudeur','montage demontage echafaudage'],
'grutier_levage': ['grutier','levage','elingage','grue mobile','grue a tour'],
'paysagiste_espaces_verts': ['paysagiste','espaces verts','plantation','engazonnement','cloture vegetale'],
'enseigne_signaletique': ['enseigne','signaletique','totem','lettrage'],
'cloture_portail': ['cloture','portail','grillage rigide'],
'montage_rayonnage': ['rayonnage','cantilever','rack','gondole','autoportant','palettier','redstock'],
'enduiseur_facadier': ['enduiseur','facadier','enduit facade','ravalement','crepis'],
'tailleur_pierre': ['tailleur de pierre','taille de pierre','pierre de taille','marbrerie']
};
var IC_METIERS_RISQUES = {
'gros_oeuvre': {
extincteurs: ['poudreABC'],
materiel: ['trousse', 'dea', 'garrot', 'attelle'],
label: 'Gros œuvre -- Maçonnerie',
traits: ['hauteur','engin_lourd','nuisance'],
epi: ['casque', 'gilet', 'chaussures', 'gants', 'lunettes', 'genouill'],
risques: [{
sit: 'Travaux de coffrage et décoffrage en hauteur',
risk: 'Chute de hauteur -- fracture -- décès',
g: 5,
mes: 'Protection contre les chutes de hauteur (collective ou individuelle) mise en œuvre par l\'entreprise, formalisée dans son PPSPS.'
}, {
sit: 'Ferraillage -- manipulation armatures acier',
risk: 'Coupures -- blessures membres supérieurs',
g: 3,
mes: 'Protection des mains et évacuation des chutes de fer à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Coulage béton -- vibration et projections',
risk: 'Projections béton -- brûlures chimiques -- TMS vibrations',
g: 3,
mes: 'Protection individuelle et organisation du travail (rotation sur vibreur) à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Travaux de maçonnerie -- port de parpaings >25kg',
risk: 'Lombalgies chroniques -- hernie discale',
g: 3,
mes: 'Port de charges limité par la loi à 55 kg pour un homme (105 kg avec avis d\'aptitude médicale), 25 kg pour une femme (R.4541-9). Aide mécanique à privilégier (R.4541-3 à R.4541-5). Moyens de manutention et formation à charge de l\'entreprise, précisés dans son PPSPS.'
}, {
sit: 'Utilisation meuleuse et disqueuse',
risk: 'Coupures -- projections -- surdité > 85dB',
g: 4,
mes: 'Seuils réglementaires d\'exposition sonore (R.4431-2) : prévention dès 80 dB(A), protection auditive obligatoire dès 85 dB(A), valeur limite 87 dB(A). Réduction du bruit à la source à privilégier (R.4434-1 et suivants). Risque de projection oculaire également identifié pour cette tâche. Protection individuelle à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Travaux à proximité de fouilles > 1,30 m',
risk: 'Chute en fouille -- ensevelissement -- décès',
g: 5,
mes: 'Fouille balisée à 1 m, circulation interdite en bord non protégé — mesure de coordination pour les entreprises intervenant à proximité. Aménagement de la fouille (blindage, étaiement) à charge de l\'entreprise de terrassement, précisé dans son PPSPS (cf. annexe terrassement).'
}, {
sit: 'Sciage béton -- découpe carrelage',
risk: 'Silicose -- cancer poumon CMR cat.1A',
g: 4,
mes: 'Valeur limite réglementaire d\'exposition à la silice cristalline : 0,1 mg/m³ pour le quartz. Moyens de réduction de l\'empoussièrement et protection respiratoire à charge de l\'entreprise selon son évaluation des risques, précisés dans son PPSPS.'
}, {
sit: 'Rénovation bâtiment avant 1997 -- amiante possible',
risk: 'Mésothéliome -- cancer poumon CMR',
g: 5,
mes: 'RAT obligatoire avant travaux (R4412-97). En cas de détection ou de suspicion d\'amiante non couverte par le repérage, arrêt de l\'intervention dans la zone concernée et information du CSPS ; la nature de l\'opération (retrait/encapsulage relevant de la sous-section 3, ou intervention susceptible d\'émettre des fibres relevant de la sous-section 4) est déterminée avant reprise des travaux. DTA consulté.'
}, {
sit: 'Coactivité avec engins de levage (grue, PEMP)',
risk: 'Chute de charge -- écrasement -- décès',
g: 5,
mes: 'Étude d\'adéquation et plan de levage établis pour l\'opération, zone sol neutralisée sous la charge, communication radio grutier/sol — mesures de coordination pour toutes les entreprises présentes.'
}, {
sit: 'Travaux par points chauds (soudure, meulage)',
risk: 'Incendie -- brûlures -- explosion',
g: 4,
mes: 'Permis de feu établi et communiqué au CSPS, surveillance de la zone après la fin des travaux par points chauds, d\'une durée fixée par le permis de feu (au moins 2 heures selon les recommandations usuelles), ou à défaut arrêt de ces travaux au moins 2 heures avant la fin de la journée — mesure de coordination pour l\'ensemble du chantier. Moyens de protection individuelle à charge de l\'entreprise, précisés dans son PPSPS.'
}]
},
'charpente_couverture': {
extincteurs: ['poudreABC', 'couverture'],
materiel: ['trousse', 'dea', 'couverture', 'brancard', 'attelle'],
label: 'Charpente -- Couverture',
traits: ['hauteur','engin_lourd'],
epi: ['casque', 'gilet', 'chaussures', 'gants', 'lunettes', 'harnais', 'longe'],
risques: [{
sit: 'Pose de charpente en hauteur (> 3m)',
risk: 'Chute de hauteur -- traumatisme grave -- décès',
g: 5,
mes: 'Protection contre les chutes de hauteur mise en œuvre par l\'entreprise, formalisée dans son PPSPS.'
}, {
sit: 'Levage de fermettes par grue ou PEMP',
risk: 'Chute de charge -- heurt -- écrasement',
g: 5,
mes: 'Plan de levage et zone neutralisée définis pour l\'opération, communication radio grutier/sol. Arrêt de la manutention selon les limites de vent fixées par le plan de levage et le constructeur de l\'engin — coordination avec le grutier. Vérification du matériel de levage (élingues) à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Pose de couverture sur toiture (tuiles, zinc, bac acier)',
risk: 'Chute sur versant -- glissade -- décès',
g: 5,
mes: 'Protection contre les chutes sur versant mise en œuvre par l\'entreprise, formalisée dans son PPSPS. Arrêt des travaux selon conditions météo défavorables.'
}, {
sit: 'Travaux sur plaques fibrociment -- amiante possible',
risk: 'Exposition amiante -- mésothéliome CMR',
g: 5,
mes: 'Vérifier l\'existence et l\'adéquation du repérage amiante avant travaux au périmètre de l\'intervention sur plaques fibrociment. En cas de suspicion non couverte par le repérage : arrêt de l\'intervention, analyse du matériau, et détermination de la sous-section applicable (3 ou 4) avant reprise.'
}, {
sit: 'Utilisation tronçonneuse et scie circulaire',
risk: 'Coupures graves -- amputation -- projections',
g: 4,
mes: 'Équipements de protection et formation à l\'utilisation d\'outils coupants à charge de l\'entreprise, précisés dans son PPSPS.'
}, {
sit: 'Pose isolants (laine de verre, laine de roche)',
risk: 'Irritation cutanée -- oculaire -- respiratoire',
g: 2,
mes: 'Protection contre l\'irritation lors de la pose d\'isolants à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Travaux en toiture-terrasse -- chaleur estivale',
risk: 'Coup de chaleur -- déshydratation -- malaise',
g: 3,
mes: 'Suivi de la météo et adaptation du travail : report des travaux de couverture en cas de vent fort, gel ou forte pluie ; adaptation des horaires en période de forte chaleur (plan canicule employeur).'
}, {
sit: 'Manutention manuelle de matériaux lourds (poutrelles, chevrons)',
risk: 'Lombalgies -- TMS membres supérieurs',
g: 3,
mes: 'Aide mécanisée recommandée dès que possible (R.4541-3 à R.4541-5) ; organisation de la manutention à charge de l\'entreprise, précisée dans son PPSPS.'
}]
},
'électricité': {
extincteurs: ['co2', 'poudreABC'],
materiel: ['trousse', 'dea', 'couverture', 'garrot'],
label: 'Électricité -- CFO/CFA',
traits: ['nuisance','hauteur'],
epi: ['casque', 'gilet', 'chaussures', 'gants', 'lunettes', 'gantselec'],
risques: [{
sit: 'Pose de chemins de câbles, luminaires et appareillages en hauteur',
risk: 'Chute de hauteur -- chute d\'objets',
g: 5,
mes: 'Travail en hauteur depuis une PEMP ou une plate-forme individuelle roulante, les échelles, escabeaux et marchepieds n\'étant pas des postes de travail (article R.4323-63) ; conduite de la PEMP réservée aux travailleurs formés et titulaires d\'une autorisation de conduite (articles R.4323-55 et R.4323-56). Zone au sol sous le poste de travail en élévation balisée et interdite aux autres entreprises — mesure de coordination.'
}, {
sit: 'Travaux sous tension ou à proximité (BT/HTA)',
risk: 'Électrocution -- brûlures par arc -- décès',
g: 5,
mes: 'Habilitation électrique obligatoire selon l\'opération (NF C18-510). Consignation (LOTO) et vérification d\'absence de tension (VAT) avant toute intervention. Travail seul interdit en zone sous tension — impératif à respecter en toutes circonstances.'
}, {
sit: 'Raccordement TGBT provisoire de chantier',
risk: 'Contact électrique indirect -- surcharge -- arc',
g: 4,
mes: 'Installation électrique provisoire de chantier (TGBT) conforme aux normes en vigueur, avec protection différentielle 30mA — modalités de mise à disposition précisées en section "Organisation générale du chantier" (moyens communs), coordination avec le CSPS.'
}, {
sit: 'Travaux de tirage de câbles dans faux-plafonds ou vides sanitaires',
risk: 'Chute de plain-pied -- TMS postures contraignantes',
g: 3,
mes: 'Équipement et organisation du travail à charge de l\'entreprise, précisés dans son PPSPS.'
}, {
sit: 'Perçage et saignées dans murs (réseaux enterrés)',
risk: 'Électrocution -- endommagement réseau eau/gaz',
g: 4,
mes: 'Avant tout perçage susceptible d\'affecter un réseau existant : détection et repérage préalables des réseaux concernés. DICT adressée par l\'exécutant lorsque l\'emprise des travaux touche la zone d\'implantation d\'un ouvrage en service (article R.554-25 du Code de l\'environnement). Consignation du réseau électrique concerné le cas échéant. Interdit de percer sans repérage préalable.'
}, {
sit: 'Intervention en espace confiné (tableau BT, local technique)',
risk: 'Électrocution -- asphyxie -- intoxication',
g: 4,
mes: 'Intervention jamais seule en espace confiné — impératif à respecter en toutes circonstances. Détection atmosphérique, consignation et procédures détaillées à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Utilisation outillage électroportatif en milieu humide',
risk: 'Électrocution -- brûlures',
g: 4,
mes: 'Matériel adapté au milieu humide à charge de l\'entreprise, précisé dans son PPSPS.'
}, {
sit: 'Bruit -- marteau-piqueur, perforateur > 85dB',
risk: 'Surdité professionnelle irréversible',
g: 3,
mes: 'Réduction du bruit à la source à privilégier (R.4434-1 et suivants). Protection auditive et évaluation de l\'exposition sonore à charge de l\'entreprise (R.4431-2) ; organisation du travail déterminée en conséquence, précisée dans son PPSPS.'
}, {
sit: 'Manutention -- déballage et tirage de câbles lourds',
risk: 'TMS -- lombalgies -- blessures dorsales',
g: 3,
mes: 'Organisation de la manutention à charge de l\'entreprise, précisée dans son PPSPS.'
}]
},
'plomberie_cvc': {
extincteurs: ['poudreABC', 'co2', 'couverture'],
materiel: ['trousse', 'dea', 'couverture', 'oculaire'],
label: 'Plomberie -- CVC -- Sanitaires',
traits: ['hauteur','point_chaud'],
epi: ['casque', 'gilet', 'chaussures', 'gants', 'lunettes', 'masqueFFP2'],
risques: [{
sit: 'Travaux de soudure (chalumeau, soudo-brasage)',
risk: 'Brûlures -- incendie -- intoxication CO/CO2',
g: 4,
mes: 'Permis de feu établi et communiqué au CSPS, surveillance de la zone après la fin des travaux par points chauds, d\'une durée fixée par le permis de feu (au moins 2 heures selon les recommandations usuelles), ou à défaut arrêt de ces travaux au moins 2 heures avant la fin de la journée — mesure de coordination pour l\'ensemble du chantier. Protection individuelle et ventilation à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Manipulation fluides frigorigènes (climatisation)',
risk: 'Intoxication -- brûlures cryogéniques -- pollution',
g: 3,
mes: 'Attestation de capacité obligatoire pour la manipulation de fluides frigorigènes (R.543-75) — obligation à charge de l\'entreprise. Équipements et procédures précisés dans son PPSPS.'
}, {
sit: 'Pose isolation thermique (laine de verre, polyuréthane)',
risk: 'Irritation cutanée et respiratoire -- COV polyuréthane',
g: 3,
mes: 'Protection contre l\'irritation lors de la pose d\'isolants à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Intervention en vide sanitaire ou gaine technique',
risk: 'Asphyxie -- intoxication H2S -- chute',
g: 4,
mes: 'Intervention jamais seule en espace confiné — impératif à respecter en toutes circonstances. Analyse atmosphérique, harnais/ligne de vie et procédures détaillées à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Travaux en toiture (groupes froid, VMC)',
risk: 'Chute de hauteur -- décès',
g: 5,
mes: 'Signalement au CSPS avant tout accès toiture — mesure de coordination. Protection contre les chutes de hauteur à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Taraudage -- filetage -- utilisation huiles de coupe',
risk: 'Projections -- inhalation brouillards huileux -- irritation',
g: 2,
mes: 'Protection individuelle à charge de l\'entreprise, précisée dans son PPSPS. Ventilation collective à prévoir si les travaux se déroulent en espace partagé avec d\'autres entreprises.'
}, {
sit: 'Réseaux existants -- amiante possible (calorifugeage, joints)',
risk: 'Exposition amiante -- CMR',
g: 5,
mes: 'RAT obligatoire avant intervention sur matériaux susceptibles de contenir de l\'amiante (R4412-97) -- vérifier l\'adéquation du repérage au périmètre des travaux. En cas de suspicion de calorifugeage amiante non couverte par le repérage : arrêt, prélèvement, détermination de la sous-section applicable (3 ou 4) avant reprise. Formation SS3 ou SS4 obligatoire pour le personnel intervenant, selon la sous-section applicable, à charge de l\'entreprise.'
}, {
sit: 'Manutention tuyauteries lourdes (fonte, cuivre)',
risk: 'Coupures -- lombalgies -- écrasement pieds',
g: 3,
mes: 'Organisation de la manutention à charge de l\'entreprise, précisée dans son PPSPS.'
}]
},
'peinture': {
extincteurs: ['poudreABC', 'mousse', 'co2'],
materiel: ['trousse', 'dea', 'oculaire', 'couverture'],
label: 'Peinture -- Revêtements muraux',
traits: ['hauteur','nuisance'],
epi: ['casque', 'gilet', 'chaussures', 'gants', 'lunettes', 'masqueA2P3', 'combi'],
risques: [{
sit: 'Application peintures solvantees, resines, vernis',
risk: 'Inhalation COV -- intoxication -- allergie respiratoire',
g: 3,
mes: 'Protection respiratoire et ventilation à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Travaux en hauteur sur échafaudage ou PEMP',
risk: 'Chute de hauteur -- fracture -- décès',
g: 4,
mes: 'La conduite d\'une PEMP est réservée aux travailleurs ayant reçu une formation adéquate et titulaires d\'une autorisation de conduite délivrée par leur employeur — obligation légale. Le CACES R.486 de la catégorie appropriée (ou équivalent reconnu) constitue le moyen recommandé d\'évaluation des connaissances et du savoir-faire. Protection contre les chutes de hauteur à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Ponçage -- grattage -- décapage de peintures anciennes',
risk: 'Silice -- plomb (peintures anciennes, notamment bâtiments antérieurs à 1949) -- poussières CMR',
g: 4,
mes: 'Vérifier l\'existence et l\'adéquation d\'un repérage plomb avant travaux (relève de l\'évaluation des risques par le maître d\'ouvrage, L.4531-1 et L.4121-2 du Code du travail ; biens <1949 — le CREP du Code de la santé publique ne s\'applique qu\'aux parties à usage d\'habitation) au périmètre des travaux ; à défaut, compléter les investigations avant intervention. Protection respiratoire et confinement du chantier à charge de l\'entreprise, précisés dans son PPSPS.'
}, {
sit: 'Application peinture en espace confiné (réservoirs, caves)',
risk: 'Asphyxie -- explosion vapeurs solvants -- intoxication',
g: 5,
mes: 'Intervention jamais seule en espace confiné — impératif à respecter en toutes circonstances. Analyse atmosphérique, ventilation forcée et plan de secours à charge de l\'entreprise, précisés dans son PPSPS.'
}, {
sit: 'Manipulation produits chimiques (décapants, nettoyants)',
risk: 'Brûlures cutanées -- oculaires -- intoxication',
g: 3,
mes: 'Protection contre les risques chimiques à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Bruit -- ponceuses, grinders > 85dB',
risk: 'Surdité professionnelle',
g: 3,
mes: 'Seuils réglementaires d\'exposition sonore (R.4431-2) : prévention dès 80 dB(A), protection auditive obligatoire dès 85 dB(A), valeur limite 87 dB(A). Protection auditive à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Postures contraignantes (plafonds, recoins)',
risk: 'TMS membres supérieurs -- cervicalgies -- tendinites',
g: 3,
mes: 'Prévention des troubles musculo-squelettiques liés aux postures contraignantes (bras levés, positions forcées) à charge de l\'entreprise, avec aménagement du rythme de travail et outillage adapté (perchette, échafaudage roulant), précisée dans son PPSPS.'
}, {
sit: 'Revêtements amiantes à décaper (bâtiment <1997)',
risk: 'Amiante -- CMR -- mésothéliome',
g: 5,
mes: 'RAT obligatoire (R4412-97). En cas de suspicion de fibres friables non couvertes par le repérage : arrêt de l\'intervention, signalement immédiat au CSPS, et détermination de la sous-section applicable (3 ou 4) avant reprise. Formation SS3 ou SS4 obligatoire pour le personnel intervenant, selon la sous-section applicable, à charge de l\'entreprise.'
}]
},
'menuiserie_metallerie': {
extincteurs: ['poudreABC', 'couverture'],
materiel: ['trousse', 'dea', 'garrot', 'couverture', 'oculaire'],
label: 'Menuiserie -- Métallerie -- Serrurie',
traits: ['hauteur','point_chaud','nuisance'],
epi: ['casque', 'gilet', 'chaussures', 'gants', 'lunettes', 'antibruit'],
risques: [{
sit: 'Pose menuiseries exterieures (fenetres, baies) en hauteur',
risk: 'Chute de hauteur -- chute de charge -- décès',
g: 4,
mes: 'Protection contre les chutes de hauteur et de charges à charge de l\'entreprise, formalisée dans son PPSPS.'
}, {
sit: 'Utilisation scie circulaire, scie a onglets, toupie',
risk: 'Coupures graves -- amputation -- projections',
g: 4,
mes: 'Machines conformes aux recommandations du fabricant, protections vérifiées et formation à l\'utilisation à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Soudure MIG/MAG -- découpe plasma',
risk: 'Rayonnements UV -- fumées métalliques -- brûlures',
g: 4,
mes: 'Protection individuelle et ventilation lors de la soudure à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Manipulation et coupe vitrage',
risk: 'Coupures profondes -- blessures graves',
g: 4,
mes: 'Protection individuelle à charge de l\'entreprise lors de la manipulation et de la coupe de vitrage, précisée dans son PPSPS. Évacuation des déchets de verre selon les modalités de gestion des déchets prévues au PGC.'
}, {
sit: 'Travaux de serrurerie -- meulage acier',
risk: 'Projections -- brûlures -- incendie',
g: 3,
mes: 'Permis de feu établi si les travaux se déroulent à proximité de matériaux combustibles — mesure de coordination communiquée au CSPS. Protection individuelle contre les projections à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Bruit -- machines > 85dB en atelier ou chantier',
risk: 'Surdité professionnelle irréversible',
g: 3,
mes: 'Seuils réglementaires d\'exposition sonore (R.4431-2) : prévention dès 80 dB(A), protection auditive obligatoire dès 85 dB(A), valeur limite 87 dB(A). Réduction du bruit à la source (isolation, encoffrement des machines) à privilégier avant la seule protection individuelle, conformément aux articles R.4434-1 et suivants du Code du travail. Protection auditive individuelle à charge de l\'entreprise en complément, précisée dans son PPSPS.'
}, {
sit: 'Manutention profiles métalliques lourds',
risk: 'Écrasement pieds -- hernies -- lombalgies',
g: 3,
mes: 'Aide mécanique à la manutention (potence, chariot) à privilégier conformément aux articles R.4541-3 à R.4541-5 du Code du travail. Équipements individuels et organisation de la manutention à charge de l\'entreprise, précisés dans son PPSPS.'
}, {
sit: 'Produits de traitement bois (lasures, creosote)',
risk: 'Inhalation COV -- contact cutane -- CMR possible',
g: 3,
mes: 'Protection contre les risques chimiques à charge de l\'entreprise, précisée dans son PPSPS.'
}]
},
'terrassement_vrd': {
extincteurs: ['poudreABC'],
materiel: ['trousse', 'dea', 'brancard', 'garrot', 'attelle'],
label: 'Terrassement -- VRD -- Réseaux',
traits: ['engin_lourd','nuisance'],
epi: ['casque', 'giletCl3', 'chaussures', 'gants', 'lunettes'],
risques: [{
sit: 'Terrassement -- fouilles > 1,30m non blindées',
risk: 'Ensevelissement -- asphyxie -- décès',
g: 5,
mes: 'Tranchées de plus de 1,30 m de profondeur, de largeur égale ou inférieure aux deux tiers de la profondeur et à parois verticales ou sensiblement verticales : blindage, étrésillonnement ou étaiement. Autres fouilles : parois aménagées selon la nature et l\'état des terres pour prévenir les éboulements. Protections mises en place avant toute descente et maintenues par temps de gel (R.4534-24). Aucun travailleur seul en fouille — mesure de coordination. Modalités précisées dans le PPSPS de l\'entreprise de terrassement.'
}, {
sit: 'Travaux à proximité réseaux enterrés (gaz, électricité HTA)',
risk: 'Explosion gaz -- électrocution -- décès',
g: 5,
mes: 'DICT adressée par l\'exécutant avant terrassement dès lors que l\'emprise des travaux touche la zone d\'implantation d\'un ouvrage en service (article R.554-25 du Code de l\'environnement) ; aucun terrassement avant l\'obtention des récépissés relatifs aux ouvrages sensibles pour la sécurité (article R.554-26, VI). Piquetage des réseaux avant terrassement. Terrassement réalisé selon les résultats de la DT-DICT, le marquage-piquetage et les prescriptions des exploitants ; sondage manuel réalisé lorsque nécessaire pour confirmer la position du réseau avant emploi d\'engins. Consignation réseau HTA. Détection gaz adaptée à la nature du réseau et à l\'analyse de risque.'
}, {
sit: 'Conduite engins de terrassement (pelle, bouteur)',
risk: 'Renversement -- collision -- écrasement piétons',
g: 4,
mes: 'La conduite d\'un engin de chantier est réservée aux travailleurs ayant reçu une formation adéquate et titulaires d\'une autorisation de conduite délivrée par leur employeur — obligation légale. Le CACES R.482 de la catégorie appropriée (ou équivalent reconnu) constitue le moyen recommandé d\'évaluation des connaissances et du savoir-faire. Plan de circulation engins/piétons — mesure de coordination pour le chantier.'
}, {
sit: 'Circulation voiries adjacentes -- risque tiers',
risk: 'Collision véhicule -- décès opérateur',
g: 4,
mes: 'Signalisation temporaire de chantier (arrêté de voirie) — mesure de coordination avec la voie publique. Protection individuelle à charge de l\'entreprise.'
}, {
sit: 'Compactage -- utilisation dameuse vibrante',
risk: 'Vibrations corps entier -- TMS lombaires',
g: 3,
mes: 'Évaluation de l\'exposition vibratoire journalière à charge de l\'entreprise (DUERP, outil OSEV) — valeur d\'action 0,5 m/s², valeur limite 1,15 m/s² (R.4443-1/2, vibrations corps entier). Siège anti-vibrations et organisation du travail déterminée en conséquence, précisée dans son PPSPS.'
}, {
sit: 'Engins -- gaz d’echappement en zone confinée',
risk: 'Intoxication CO -- asphyxie',
g: 3,
mes: 'Prévention du risque d\'intoxication en zone confinée à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Asphalte et goudron -- bitume chaud',
risk: 'Brûlures -- COV -- HAP cancérogènes',
g: 4,
mes: 'Protection individuelle et surveillance médicale à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Bruit -- marteau-piqueur, compacteur > 85dB',
risk: 'Surdité professionnelle',
g: 3,
mes: 'Seuils réglementaires d\'exposition sonore (R.4431-2) : prévention dès 80 dB(A), protection auditive obligatoire dès 85 dB(A), valeur limite 87 dB(A). Réduction du bruit à la source à privilégier (matériel aux normes, R.4434-1). Protection auditive individuelle et évaluation de l\'exposition à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Terrassement en terrain siliceux -- sableux -- argileux -- sciage béton',
risk: 'Silicose -- cancer poumon CMR cat.1A -- maladie professionnelle',
g: 4,
mes: 'Valeur limite réglementaire d\'exposition à la silice cristalline : 0,1 mg/m³ pour le quartz (R.4412-149). Moyens de réduction de l\'empoussièrement et protection respiratoire à charge de l\'entreprise, précisés dans son PPSPS.'
}, {
sit: 'Conduite prolongee engins -- pelles -- tombereaux -- compacteurs',
risk: 'Vibrations corps entier -- lombalgies chroniques -- hernies discales',
g: 3,
mes: 'Évaluation de l\'exposition vibratoire journalière à charge de l\'entreprise (DUERP, outil OSEV) — valeur d\'action 0,5 m/s², valeur limite 1,15 m/s² à ne jamais dépasser (R.4443-1 et R.4443-2). Siège anti-vibrations et organisation du travail déterminée en conséquence, précisée dans son PPSPS.'
}, {
sit: 'Intemperies hivernales (gel, verglas, forte pluie)',
risk: 'Chute -- accident lie aux conditions meteo degradees',
g: 2,
mes: 'Suivi de la météo et adaptation du travail : report des travaux de terrassement en cas de gel, forte pluie ou conditions dangereuses pour la stabilité du terrain ; adaptation des horaires en période de forte chaleur (plan canicule employeur).'
}]
},
'démolition_désamiantage': {
extincteurs: ['poudreABC', 'bac'],
materiel: ['trousse', 'dea', 'couverture', 'brancard', 'garrot', 'attelle'],
label: 'Démolition -- Désamiantage',
traits: ['nuisance','engin_lourd','amiante_confinement'],
epi: ['casque', 'gilet', 'chaussures', 'gants', 'lunettes', 'masqueFFP3', 'combi'],
risques: [{
sit: 'Démolition structure béton, maçonnerie, charpente',
risk: 'Effondrement -- chute de matériaux -- décès',
g: 5,
mes: 'Règle d\'organisation retenue pour ce chantier : étude et plan de démolition validés par un bureau d\'études structure, emplacements de chute des matériaux délimités et interdits au stationnement des personnes, périmètre de sécurité défini dans l\'étude préalable de l\'entreprise (recommandation CNAM R 345) et soumis au CSPS. Progression démolition de haut en bas. Étayage si nécessaire. Présence CSPS avant démarrage.'
}, {
sit: 'Poussières de silice lors de démolition béton',
risk: 'Silicose -- cancer poumon CMR cat.1A',
g: 4,
mes: 'Valeur limite réglementaire d\'exposition à la silice cristalline : 0,1 mg/m³ pour le quartz (R.4412-149). Moyens de réduction et protection respiratoire à charge de l\'entreprise, précisés dans son PPSPS.'
}, {
sit: 'Présence amiante -- retrait / encapsulage (SS3) ou intervention à risque d\'émission (SS4)',
risk: 'Mésothéliome -- cancer poumon -- CMR',
g: 5,
mes: 'Pour les travaux relevant de la sous-section 3 (retrait/encapsulage planifié) : plan de démolition, de retrait ou d\'encapsulage transmis via la plateforme DEMAT@MIANTE (R.4412-133 et R.4412-137) -- délai 30 jours avant travaux, formation SS3. Pour une intervention relevant de la sous-section 4 (intervention sur des matériaux, équipements, matériels ou articles susceptibles de provoquer l\'émission de fibres d\'amiante) : mode opératoire établi conformément à l\'article R.4412-145, formation SS4. Dans les deux cas : appareils de protection respiratoire, vêtements de protection, moyens de décontamination, dispositif de confinement et modalités de contrôle de l\'air définis par le plan de retrait ou le mode opératoire, en fonction du processus et du niveau d\'empoussièrement estimé ou mesuré.'
}, {
sit: 'Présence possible de plomb (peintures anciennes, notamment bâtiments antérieurs à 1949)',
risk: 'Saturnisme -- atteinte neurologique -- CMR',
g: 4,
mes: 'Aucun texte n\'impose de repérage plomb avant travaux équivalent au repérage amiante ; le maître d\'ouvrage doit toutefois évaluer le risque plomb de son opération (L.4531-1 et L.4121-2 du Code du travail) et transmettre avant travaux le repérage ou les informations dont il dispose — le CREP du Code de la santé publique (L.1334-5 et s.) ne s\'applique qu\'aux parties de bâtiment à usage d\'habitation. Le CSPS et l\'entreprise vérifient l\'existence et l\'adéquation de ce repérage au périmètre des travaux ; à défaut, les investigations doivent être complétées avant intervention. Protection respiratoire et hygiène à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Chute de débris depuis niveaux supérieurs',
risk: 'Traumatisme cranien -- décès',
g: 4,
mes: 'Zone de démolition active balisée et interdite au passage — mesure de coordination. Protection individuelle à charge de l\'entreprise.'
}, {
sit: 'Utilisation engins de démolition (grappin, brise-roche)',
risk: 'Renversement -- projection pierres -- décès',
g: 4,
mes: 'La conduite d\'un engin de démolition est réservée aux travailleurs ayant reçu une formation adéquate et titulaires d\'une autorisation de conduite délivrée par leur employeur — obligation légale. Le CACES R.482 de la catégorie appropriée (ou équivalent reconnu) constitue le moyen recommandé d\'évaluation des connaissances et du savoir-faire. Emplacements de chute des matériaux délimités et interdits au stationnement des personnes, périmètre de sécurité défini dans l\'étude préalable de l\'entreprise (recommandation CNAM R 345) et soumis au CSPS — mesure de coordination pour le chantier.'
}, {
sit: 'Réseaux actifs dans bâtiment démoli',
risk: 'Électrocution -- explosion gaz -- intoxication',
g: 5,
mes: 'Neutralisation (coupure et condamnation) de l\'ensemble des réseaux desservant l\'ouvrage à démolir — eau, gaz, électricité, chaleur — avant tout démarrage des travaux, attestée par écrit par l\'exploitant ou l\'entreprise qui l\'a réalisée et transmise au CSPS — règle de coordination retenue pour ce chantier. DICT adressée aux exploitants dont les ouvrages sont touchés par l\'emprise des travaux (article R.554-25 du Code de l\'environnement).'
}, {
sit: 'Vibrations transmises aux bâtiments adjacents',
risk: 'Fissuration -- dommages ouvrages tiers',
g: 3,
mes: "Sismographe si bâtiment fragile contigu. Constat d'huissier avant travaux. Limitation energie brise-roche. Suivi quotidien des fissures."
}]
},
'étanchéité_isolation': {
extincteurs: ['poudreABC', 'couverture', 'co2'],
materiel: ['trousse', 'dea', 'couverture', 'brancard'],
label: 'Étanchéité -- Isolation thermique',
traits: ['hauteur','point_chaud','nuisance'],
epi: ['casque', 'gilet', 'chaussures', 'gants', 'lunettes', 'harnais', 'masqueA2P3', 'combi'],
risques: [{
sit: 'Travaux en toiture-terrasse -- étanchéité bicouche ou monocouche',
risk: 'Chute de hauteur -- décès',
g: 5,
mes: 'Accès à la toiture interdit à toute personne tant que la protection contre les chutes n\'est pas en place — mesure de coordination pour tous les intervenants. Protection contre les chutes de hauteur (harnais, ligne de vie, échafaudage périphérique) mise en œuvre par l\'entreprise, formalisée dans son PPSPS. Arrêt des travaux selon conditions météo défavorables.'
}, {
sit: 'Application bitume chaud -- chalumeau',
risk: 'Brûlures graves -- incendie -- COV bitume',
g: 4,
mes: 'Permis de feu établi et communiqué au CSPS, surveillance de la zone après la fin des travaux par points chauds, d\'une durée fixée par le permis de feu (au moins 2 heures selon les recommandations usuelles), ou à défaut arrêt de ces travaux au moins 2 heures avant la fin de la journée — mesure de coordination pour l\'ensemble du chantier. Protection individuelle à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Pose isolants en vrac ou rouleaux (laine minérale)',
risk: 'Irritation cutanée -- oculaire -- respiratoire',
g: 2,
mes: 'Protection individuelle contre l\'irritation à charge de l\'entreprise, précisée dans son PPSPS. Ventilation collective à prévoir si les travaux se déroulent en espace partagé avec d\'autres entreprises.'
}, {
sit: 'Application mousse polyuréthane projetee',
risk: 'Inhalation isocyanates -- asthme professionnel',
g: 3,
mes: 'Protection individuelle contre les isocyanates (CMR) à charge de l\'entreprise, précisée dans son PPSPS. Ventilation collective à prévoir si les travaux se déroulent en espace partagé avec d\'autres entreprises.'
}, {
sit: 'Manipulation solvants de nettoyage -- acetone, MEK',
risk: 'Inhalation COV -- irritation -- intoxication',
g: 3,
mes: 'Protection contre les risques chimiques et stockage sécurisé à charge de l\'entreprise, précisés dans son PPSPS.'
}, {
sit: 'Travaux en toiture sous chaleur estivale',
risk: 'Coup de chaleur -- déshydratation -- syncope',
g: 3,
mes: 'Suivi de la météo et adaptation du travail : report des travaux de toiture-terrasse en cas de vent fort, gel ou forte pluie ; adaptation des horaires en période de forte chaleur (plan canicule employeur).'
}, {
sit: 'Levage rouleaux lourds (plaque, rouleau bitume)',
risk: 'TMS -- écrasement pieds -- lombalgies',
g: 3,
mes: 'Organisation de la manutention à charge de l\'entreprise, précisée dans son PPSPS.'
}]
},
'second_oeuvre': {
extincteurs: ['poudreABC'],
materiel: ['trousse', 'dea', 'garrot', 'attelle'],
label: 'Second oeuvre -- Plaquiste -- Cloisons',
traits: ['hauteur','nuisance'],
epi: ['casque', 'gilet', 'chaussures', 'gants', 'lunettes', 'masqueFFP2', 'genouill'],
risques: [{
sit: 'Pose plaques de platre sur échafaudage ou PEMP',
risk: 'Chute de hauteur -- chute de plaque -- décès',
g: 4,
mes: 'La conduite d\'une PEMP est réservée aux travailleurs ayant reçu une formation adéquate et titulaires d\'une autorisation de conduite délivrée par leur employeur — obligation légale. Le CACES R.486 de la catégorie appropriée (ou équivalent reconnu) constitue le moyen recommandé d\'évaluation des connaissances et du savoir-faire. Protection contre les chutes à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Découpe plaques -- scie -- cutter',
risk: 'Coupures -- poussières platre et silice',
g: 3,
mes: 'Protection et aspiration lors de la découpe à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Travaux en position accroupie ou a genoux',
risk: 'Tendinites -- bursite genoux -- TMS',
g: 3,
mes: 'Organisation du travail (postures) à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Enduits et projections (enduit projete, platre)',
risk: 'Projections -- brûlures alcalines -- inhalation',
g: 3,
mes: 'Protection contre les projections à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Rénovation -- doublage -- amiante possible',
risk: 'Amiante -- CMR',
g: 5,
mes: 'RAT obligatoire avant intervention sur matériaux susceptibles de contenir de l\'amiante -- vérifier l\'adéquation du repérage au périmètre des travaux. En cas de suspicion de fibres friables non couvertes par le repérage : arrêt de l\'intervention, signalement CSPS, détermination de la sous-section applicable (3 ou 4) avant reprise. Formation SS3 ou SS4 obligatoire pour le personnel intervenant, selon la sous-section applicable, à charge de l\'entreprise.'
}, {
sit: 'Utilisation visserie electroportative en continu',
risk: 'Vibrations membres supérieurs -- TMS -- Raynaud',
g: 2,
mes: 'Évaluation de l\'exposition vibratoire journalière à charge de l\'entreprise (DUERP) — valeur d\'action 2,5 m/s², valeur limite 5 m/s² pour les vibrations mains-bras (R.4443-1 et R.4443-2). Outillage anti-vibrations et organisation du travail déterminée en conséquence, précisée dans son PPSPS.'
}, {
sit: 'Découpe de carrelage ou faïence (silice cristalline)',
risk: 'Silicose -- cancer bronchopulmonaire (CMR)',
g: 4,
mes: 'Valeur limite réglementaire d\'exposition à la silice cristalline : 0,1 mg/m³ pour le quartz (R.4412-149). Moyens de captage et protection respiratoire à charge de l\'entreprise, précisés dans son PPSPS.'
}, {
sit: 'Coactivité -- risques importes des autres corps',
risk: 'Chute de charges -- projections -- bruit',
g: 3,
mes: 'Coordination avec CSPS. Casque EN 397. Respect planning coactivité. Signalement immédiat de tout incident au CSPS.'
}]
},
'revêtement_pvc': {
extincteurs: ['poudreABC', 'co2', 'mousse'],
materiel: ['trousse', 'dea', 'oculaire', 'couverture'],
label: 'Revêtement sol PVC -- Decochoc -- Linoleum',
traits: ['nuisance'],
epi: ['casque', 'gilet', 'chaussures', 'gants', 'lunettes', 'masqueA2P3', 'genouill'],
risques: [{
sit: 'Préparation sol -- ragréage -- ponçage support',
risk: 'Poussières silice ciment -- COV ragréage -- TMS genoux',
g: 3,
mes: 'Protection et aspiration lors du ponçage à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Application colles neoprene et polyuréthane',
risk: 'Inhalation COV -- intoxication -- allergie -- explosion',
g: 4,
mes: 'Produits classés CMR (solvants) soumis aux règles renforcées de prévention chimique (R.4412-59 à R.4412-93) : substitution par un produit moins dangereux dès que possible, captage et ventilation du local, stockage en récipients hermétiques et étiquetés, prévention du risque incendie (pas de flamme nue à proximité). Protection respiratoire individuelle à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Soudure de les PVC au chalumeau air chaud',
risk: 'Inhalation chlorure de vinyle -- COV thermiques',
g: 3,
mes: 'Protection respiratoire et ventilation à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Décapage ancien revêtement (vinyle, linoleum <1997)',
risk: 'Amiante -- dalles vinyle amiantees CMR',
g: 5,
mes: 'DIAGNOSTIC AMIANTE OBLIGATOIRE avant tout décapage -- Repérage amiante avant travaux (R4412-97). En cas de présence confirmée de colle ou dalle amiantée : arrêt de l\'intervention et détermination de la sous-section applicable (3 pour un retrait planifié, 4 pour une intervention susceptible d\'émettre des fibres d\'amiante) avant reprise. Formation SS3 ou SS4 obligatoire pour le personnel intervenant, selon la sous-section applicable, à charge de l\'entreprise.'
}, {
sit: 'Travail en position agenouillee prolongee',
risk: 'Bursite rotulienne -- tendinite -- TMS genoux',
g: 3,
mes: 'Prévention des troubles musculo-squelettiques liés à la position agenouillée prolongée à charge de l\'entreprise (genouillères, aménagement du rythme de travail), précisée dans son PPSPS.'
}, {
sit: 'Port et manutention de rouleaux PVC (25-50kg)',
risk: 'Lombalgies -- hernies -- TMS dorso-lombaires',
g: 3,
mes: 'Organisation de la manutention à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Travaux de nettoyage au solvant (IPA, acetone)',
risk: 'Inhalation -- irritation -- intoxication',
g: 2,
mes: 'Restriction des quantités de produits sur la zone de travail, conformément aux articles R.4412-70 à R.4412-75 du Code du travail. Protection individuelle et ventilation à charge de l\'entreprise, précisées dans son PPSPS.'
}]
},
'plafonds_suspendus': {
extincteurs: ['poudreABC'],
materiel: ['trousse', 'dea', 'brancard', 'attelle'],
label: 'Plafonds suspendus -- Faux-plafonds -- Dalles',
traits: ['hauteur','nuisance'],
epi: ['casque', 'gilet', 'chaussures', 'gants', 'lunettes', 'masqueFFP2', 'genouill'],
risques: [{
sit: 'Pose ossature et dalles en hauteur (> 2m) sur échafaudage roulant ou PEMP',
risk: 'Chute de hauteur -- chute de matériaux -- décès',
g: 4,
mes: 'La conduite d\'une PEMP est réservée aux travailleurs ayant reçu une formation adéquate et titulaires d\'une autorisation de conduite délivrée par leur employeur — obligation légale. Le CACES R.486 de la catégorie appropriée (ou équivalent reconnu) constitue le moyen recommandé d\'évaluation des connaissances et du savoir-faire. Protection contre les chutes à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Travaux bras levés prolonges (fixation suspentes, rails)',
risk: 'TMS membres supérieurs -- tendinites coiffe des rotateurs -- cervicalgies',
g: 3,
mes: 'Organisation du travail à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Dépose plafond existant -- bâtiment < 1997',
risk: 'Amiante -- flocages -- colles amiantees -- CMR',
g: 5,
mes: 'DIAGNOSTIC AMIANTE OBLIGATOIRE avant toute dépose -- Repérage amiante avant travaux (R4412-97). En cas de présence confirmée de flocage ou colle amiantée : arrêt total de l\'intervention et détermination de la sous-section applicable (3 ou 4) avant reprise. Formation SS3 ou SS4 obligatoire pour le personnel intervenant, selon la sous-section applicable, à charge de l\'entreprise. Protection respiratoire adaptée en attendant le résultat du diagnostic, à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Découpe et manipulation dalles laine de roche ou laine de verre',
risk: 'Irritation cutanée -- oculaire -- voies respiratoires',
g: 2,
mes: 'Protection contre l\'irritation à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Perçage dalles et fixation chevilles sur béton',
risk: 'Poussières silice -- bruit > 85dB -- projections',
g: 3,
mes: 'Protection individuelle et aspiration à charge de l\'entreprise, précisées dans son PPSPS.'
}, {
sit: 'Coactivité -- autres corps intervenant simultanement',
risk: 'Chute de charges depuis niveaux supérieurs -- bruit -- projection',
g: 3,
mes: 'Signalement au CSPS de toute coactivité à risque, filets de protection si travaux superposés, coordination planning — mesures de coordination pour le chantier.'
}, {
sit: 'Manutention cartons de dalles (10-20kg les 12)',
risk: 'TMS lombaires -- entorses',
g: 2,
mes: 'Organisation de la manutention à charge de l\'entreprise, précisée dans son PPSPS.'
}]
},
'echafaudeur': {
extincteurs: ['poudreABC'],
materiel: ['trousse','dea','attelle','garrot'],
label: 'Échafaudeur — Montage / démontage',
traits: ['hauteur','engin_lourd'],
epi: ['casque','gilet','chaussures','gants','harnais','lunettes'],
risques: [
{ sit: 'Montage et démontage d’échafaudage en hauteur', risk: 'Chute de hauteur — décès', g: 5, mes: 'Formation au montage/démontage/vérification obligatoire (R.4323-69) — obligation légale. Méthode de montage en sécurité à charge de l\'entreprise, précisée dans son PPSPS. Interruption selon conditions météo défavorables.' },
{ sit: 'Stabilité, appuis et amarrages de l’échafaudage', risk: 'Effondrement — renversement', g: 5, mes: 'Stabilité, amarrages et charge d\'exploitation à charge de l\'entreprise, conformes au plan de montage et à la norme EN 12811.' },
{ sit: 'Réception et vérifications de l’échafaudage', risk: 'Mise à disposition non conforme', g: 4, mes: 'Examen de montage et vérification journalière (R.4323-69 à R.4323-80). Étiquette de conformité ; accès interdit tant que non réceptionné.' },
{ sit: 'Manutention des éléments (planchers, cadres, tubes)', risk: 'TMS — écrasement — chute d’objets', g: 3, mes: 'Zone au sol balisée et interdite pendant la manutention — mesure de coordination. Équipement de manutention à charge de l\'entreprise.' },
{ sit: 'Chute d’objets vers le personnel en contrebas', risk: 'Heurt — chute de matériaux', g: 4, mes: 'Périmètre de sécurité au sol et coordination de la co-activité via le CSPS — mesures de coordination. Plinthes/filets à charge de l\'entreprise.' },
{ sit: 'Lignes électriques aériennes à proximité', risk: 'Électrisation — électrocution', g: 5, mes: 'Respect des distances de sécurité (R.4544-24 du Code du travail, issu du décret n°2024-552 du 17 juin 2024). Mise hors tension par le concessionnaire si nécessaire (R.4544-21). Balisage.' },
{ sit: 'Utilisation de l’échafaudage par d’autres corps (co-activité)', risk: 'Surcharge — modification non autorisée', g: 3, mes: 'Interdiction de modifier l’échafaudage sans l’échafaudeur. Charge d’exploitation affichée. Information des corps d’état concernés.' }
]
},
'grutier_levage': {
extincteurs: ['poudreABC','co2'],
materiel: ['trousse','dea','attelle'],
label: 'Grutier — Levage — Élingage',
traits: ['engin_lourd'],
epi: ['casque','gilet','giletCl3','chaussures','gants'],
risques: [
{ sit: 'Conduite de grue (à tour ou mobile)', risk: 'Renversement — basculement de la grue', g: 5, mes: 'La conduite d\'une grue est réservée aux travailleurs ayant reçu une formation adéquate et titulaires d\'une autorisation de conduite délivrée par leur employeur — obligation légale. Le CACES R.483 ou R.487 selon l\'engin (ou équivalent reconnu) constitue le moyen recommandé d\'évaluation des connaissances et du savoir-faire. Calage, stabilisateurs et respect de l\'abaque de charge à charge de l\'entreprise. Arrêt selon seuil constructeur en cas de vent fort.' },
{ sit: 'Élingage et levage de charges', risk: 'Chute de charge — décrochage — écrasement', g: 5, mes: 'Interdiction de stationner sous la charge — mesure de coordination pour le chantier. Vérification du matériel de levage et formation de l\'élingueur à charge de l\'entreprise, précisées dans son PPSPS.' },
{ sit: 'Survol de charges au-dessus de zones occupées', risk: 'Chute de charge sur personnel ou voie publique', g: 5, mes: 'Interdiction de survol des zones occupées et de la voie publique. Zones de prise et de dépose balisées. Coordination de la co-activité levage au PGC et avec le CSPS.' },
{ sit: 'Lignes électriques aériennes', risk: 'Amorçage électrique — électrocution', g: 5, mes: 'Respect des distances de sécurité (R.4544-24 du Code du travail, issu du décret n°2024-552 du 17 juin 2024). Limiteur de zone et anticollision. Consignation par le concessionnaire si nécessaire (R.4544-21).' },
{ sit: 'Vérification et maintenance de l’appareil de levage', risk: 'Défaillance mécanique', g: 4, mes: 'Vérifications générales périodiques (VGP) et carnet de maintenance à jour (R.4323-23). Contrôle avant prise de poste.' },
{ sit: 'Interférence entre grues (co-activité levage)', risk: 'Collision de flèches — chute de charge', g: 4, mes: 'Plan d’interférence des grues, zonage et priorités arrêtés au PGC. Liaison radio entre grutiers. Système anticollision conforme aux exigences de sécurité de la norme NF EN 14439 en vigueur.' },
{ sit: 'Conditions météo (vent, visibilité)', risk: 'Perte de contrôle de la charge', g: 4, mes: 'Arrêt du levage selon les seuils constructeur. Pas de levage par visibilité insuffisante. Anémomètre et girouette fonctionnels.' },
{ sit: 'Manutention des élingues et accessoires', risk: 'TMS — coincement des mains', g: 2, mes: 'Organisation et contrôle du matériel à charge de l\'entreprise, précisés dans son PPSPS.' }
]
},
'paysagiste_espaces_verts': {
extincteurs: ['poudreABC','eau'],
materiel: ['trousse','dea','oculaire'],
label: 'Paysagiste — Espaces verts',
traits: ['hauteur','engin_lourd','nuisance'],
epi: ['casque','gilet','chaussures','gants','lunettes','antibruit'],
risques: [
{ sit: 'Débroussaillage, tonte et taille (outils rotatifs)', risk: 'Projections — coupures — bruit supérieur à 85 dB', g: 3, mes: 'Périmètre de sécurité contre les projections — mesure utile aux tiers présents. Protection individuelle à charge de l\'entreprise, précisée dans son PPSPS.' },
{ sit: 'Application de produits phytosanitaires', risk: 'Intoxication — CMR — pollution', g: 4, mes: 'Certiphyto exigible pour l\'application professionnelle (article L.254-3 du Code rural et de la pêche maritime) ; aucune application en présence d\'autres intervenants dans la zone traitée et délais de rentrée de l\'étiquette respectés — mesure de coordination. Équipements à charge de l\'entreprise, précisés dans son PPSPS.' },
{ sit: 'Élagage et travail en hauteur dans les arbres', risk: 'Chute de hauteur — chute de branches', g: 5, mes: 'Accès interdit à toute personne sous la zone d\'élagage pendant l\'intervention — périmètre balisé au sol. Formation et équipement du grimpeur-élagueur à charge de l\'entreprise, précisés dans son PPSPS.' },
{ sit: 'Manutention (terre, végétaux, matériaux)', risk: 'TMS lombaires — postures contraignantes', g: 3, mes: 'Organisation de la manutention à charge de l\'entreprise, précisée dans son PPSPS.' },
{ sit: 'Conduite de tondeuse autoportée ou mini-pelle', risk: 'Renversement d’engin — heurt', g: 4, mes: 'Conduite réservée aux travailleurs formés et titulaires d\'une autorisation de conduite délivrée par leur employeur (articles R.4323-55 et R.4323-56), le CACES R 482 étant le moyen privilégié pour les engins de chantier ; zone d\'évolution balisée en cas de co-activité — mesure de coordination. Équipements à charge de l\'entreprise, précisés dans son PPSPS.' },
{ sit: 'Risque biologique (hyménoptères, tiques, plantes)', risk: 'Piqûres — maladie de Lyme — allergies', g: 2, mes: 'Matériel de premiers secours adapté aux risques biologiques du métier (piqûres, tiques, plantes urticantes), conformément aux articles R.4224-14 et R.4224-16 du Code du travail — composition définie après avis du médecin du travail. Prévention à charge de l\'entreprise, précisée dans son PPSPS.' },
{ sit: 'Co-activité sur chantier BTP (VRD, gros œuvre)', risk: 'Heurt d’engins — chute dans une fouille', g: 3, mes: 'Circulation selon le plan de circulation du chantier ; fouilles ouvertes balisées par le lot qui les crée — coordination via le CSPS.' },
{ sit: 'Travail en bord de voie ouverte à la circulation', risk: 'Heurt par un véhicule', g: 4, mes: 'Signalisation temporaire et alternat/déviation — mesure de coordination avec la voie publique. Équipement individuel à charge de l\'entreprise.' },
{ sit: 'Intemperies hivernales (gel, verglas, forte pluie)', risk: 'Chute -- accident lie aux conditions meteo degradees', g: 2, mes: 'Suivi de la météo et adaptation du travail : report des travaux en cas de gel, verglas ou forte pluie ; adaptation des horaires en période de forte chaleur (plan canicule employeur).' }
]
},
// [Point 18 audit - 23/09] trois metiers sans fiche (lots ENSEIGNE,
// CLOTURE/PORTAIL a Auray, RAYONNAGE/REDSTOCK a Ploneour). References
// verifiees dans la session : R.4323-55/56 et R 486 (PEMP), R.554-25/27
// C. env. (DICT, marquage), R.4224-12/13 et arrete du 21/12/1993
// (portails), R.4532-14 (site en activite), R.4323-63 (echelles),
// R.4534-95 et R.4534-99 (ossatures), INRS ED 771 et NF EN 15635
// (rayonnages). Mesures sans article = mesures de coordination du CSPS.
'enseigne_signaletique': {
extincteurs: ['poudreABC'],
materiel: ['trousse','dea'],
label: 'Enseigne — Signalétique',
traits: ['hauteur'],
epi: ['casque','gilet','chaussures','gants','harnais'],
risques: [
{ sit: 'Pose en façade depuis une nacelle (PEMP)', risk: 'Chute de hauteur — chute d\'objets', g: 5, mes: 'Zone au sol sous la nacelle et sous la zone de pose balisée et interdite aux autres entreprises et au public pendant l\'intervention — mesure de coordination. Conduite de la PEMP réservée aux travailleurs formés (R.4323-55) et titulaires d\'une autorisation de conduite délivrée par leur employeur (R.4323-56), le CACES R 486 en étant le moyen privilégié.' },
{ sit: 'Raccordement électrique de l\'enseigne', risk: 'Électrisation — électrocution', g: 4, mes: 'Raccordement réalisé sur un circuit hors tension et consigné, en coordination avec le lot électricité ; aucune mise sous tension sans son accord — mesure de coordination. Habilitation électrique à charge de l\'entreprise, précisée dans son PPSPS.' },
{ sit: 'Massif de fondation d\'un totem', risk: 'Contact avec un réseau enterré', g: 4, mes: 'DICT adressée par l\'exécutant des travaux avant intervention (article R.554-25 du Code de l\'environnement) et respect du marquage-piquetage (article R.554-27).' },
{ sit: 'Levage et pose d\'éléments lourds (totem, caissons)', risk: 'Chute de charge — écrasement', g: 4, mes: 'Zone d\'évolution de l\'engin de levage balisée ; aucune activité sous la charge — mesure de coordination.' },
{ sit: 'Pose sur un site ouvert au public', risk: 'Heurt ou chute d\'objet sur des tiers', g: 4, mes: 'Zones et horaires d\'intervention définis avec le chef d\'établissement lors de l\'inspection commune (article R.4532-14).' }
]
},
'cloture_portail': {
extincteurs: ['poudreABC'],
materiel: ['trousse','dea'],
label: 'Clôture — Portail',
traits: ['engin_lourd'],
epi: ['casque','gilet','chaussures','gants','antibruit'],
risques: [
{ sit: 'Forage ou fouille pour poteaux et plots (tarière, mini-pelle)', risk: 'Contact avec un réseau enterré — électrocution, explosion de gaz', g: 5, mes: 'DICT adressée par l\'exécutant avant intervention (article R.554-25 du Code de l\'environnement) et respect du marquage-piquetage (article R.554-27) ; aucun forage avant transmission des récépissés de DICT au coordonnateur SPS — mesure de coordination.' },
{ sit: 'Pose des panneaux, poteaux et vantaux de portail', risk: 'Écrasement — chute de charge', g: 4, mes: 'Zone de pose balisée jusqu\'au scellement définitif ; vantaux immobilisés contre toute chute jusqu\'au réglage final — mesure de coordination. Avant réception, remise des éléments d\'entretien et de contrôle du portail (article R.4224-12), versés au DIUO.' },
{ sit: 'Mise en service d\'un portail motorisé', risk: 'Coincement — écrasement — électrisation', g: 4, mes: 'Raccordement électrique en coordination avec le lot électricité ; zone de manœuvre interdite pendant les essais ; portail signalé hors service jusqu\'à sa mise en service — mesure de coordination. Avant mise en service, remise de la déclaration de conformité CE (directive Machines 2006/42/CE, norme NF EN 13241) et des éléments du dossier de maintenance prévu par l\'arrêté du 21 décembre 1993 (article R.4224-13), versés au DIUO.' },
{ sit: 'Travaux en limite de propriété ou le long de la voie publique', risk: 'Heurt par un véhicule', g: 4, mes: 'Signalisation temporaire ; coordination avec le lot VRD et, si le site reste en activité, avec le chef d\'établissement (article R.4532-14).' }
]
},
'montage_rayonnage': {
extincteurs: ['poudreABC'],
materiel: ['trousse','dea'],
label: 'Rayonnage — Cantilever',
traits: ['hauteur','engin_lourd'],
epi: ['casque','gilet','chaussures','gants','harnais'],
risques: [
{ sit: 'Montage des colonnes, bras et lisses en hauteur', risk: 'Chute de hauteur', g: 5, mes: 'Travail depuis une PEMP ou un équipement assurant une protection collective, les échelles n\'étant pas des postes de travail (article R.4323-63) ; conduite de la PEMP réservée aux travailleurs formés et titulaires d\'une autorisation de conduite (articles R.4323-55 et R.4323-56, CACES R 486). Zone de montage balisée et interdite aux autres entreprises — mesure de coordination.' },
{ sit: 'Stabilité des travées en cours de montage', risk: 'Renversement — écrasement', g: 5, mes: 'Montage selon la notice du fabricant, les éléments étant ancrés et contreventés au fur et à mesure. Mesure de coordination retenue pour ce chantier : zone de montage interdite aux autres entreprises jusqu\'à la stabilisation des travées.' },
{ sit: 'Rayonnages extérieurs lourds et cantilevers autoportants (ossatures)', risk: 'Chute de hauteur — effondrement en cours de montage', g: 5, mes: 'Réduction au minimum des travaux en hauteur et assemblage au sol chaque fois que possible (article R.4534-95) ; à défaut de postes de travail et d\'accès protégés, dispositifs limitant la hauteur de chute libre (auvents, planchers ou filets, article R.4534-99).' },
{ sit: 'Ancrage au dallage (perçage)', risk: 'Dallage insuffisamment résistant — fourreaux noyés', g: 4, mes: 'Date d\'intervention validée avec le lot dallage (résistance atteinte) et repérage des fourreaux avant perçage — mesure de coordination. Stabilité assurée par un sol plan et horizontal (INRS ED 771).' },
{ sit: 'Levage et manutention d\'éléments longs', risk: 'Chute de charge — heurt', g: 4, mes: 'Zone d\'évolution des engins balisée ; aucune activité sous la charge — mesure de coordination.' },
{ sit: 'Première mise en charge', risk: 'Effondrement', g: 4, mes: 'Vérification de l\'installation par le fournisseur ou un organisme compétent avant mise en service, recommandée par l\'INRS (ED 771) ; exploitation et maintenance ensuite selon la norme NF EN 15635.' }
]
},
'enduiseur_facadier': {
extincteurs: ['poudreABC'],
materiel: ['trousse', 'dea', 'attelle'],
label: 'Enduiseur -- Façadier -- Ravalement',
traits: ['hauteur','nuisance'],
epi: ['casque', 'gilet', 'chaussures', 'gants', 'lunettes', 'masqueFFP2', 'harnais'],
risques: [{
sit: 'Travaux de ravalement et d\'enduit en façade, en hauteur',
risk: 'Chute de hauteur -- décès',
g: 5,
mes: 'Contrôle de la stabilité de l\'échafaudage avant chaque prise de poste, notamment après montage par une autre entreprise — point de vigilance en cas de co-activité. Protection contre les chutes à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Projection ou application manuelle d\'enduit -- poussières de ciment',
risk: 'Silicose -- affections respiratoires liées à la silice cristalline',
g: 4,
mes: 'Valeur limite réglementaire d\'exposition à la silice cristalline : 0,1 mg/m³ pour le quartz (R.4412-149). Moyens de réduction et protection respiratoire à charge de l\'entreprise, précisés dans son PPSPS.'
}, {
sit: 'Décapage de façade avant ravalement',
risk: 'Exposition à des produits chimiques (décapants, résines) et projections',
g: 3,
mes: 'Protection contre les risques chimiques à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Gestes répétitifs de projection et lissage -- sollicitation de l\'épaule',
risk: 'TMS -- tendinopathie de l\'épaule, troubles musculo-squelettiques',
g: 3,
mes: 'Prévention des troubles musculo-squelettiques liés aux gestes répétitifs à charge de l\'entreprise (outillage limitant l\'effort, aménagement du rythme de travail), précisée dans son PPSPS.'
}, {
sit: 'Rénovation de façade ancienne -- amiante ou plomb possible dans les enduits/peintures existants',
risk: 'Exposition amiante ou plomb -- CMR',
g: 5,
mes: 'Vérifier l\'existence et l\'adéquation d\'un repérage amiante et/ou plomb au périmètre des travaux avant décapage. En cas de suspicion non couverte par le repérage : arrêt de l\'intervention, signalement au CSPS, détermination de la sous-section applicable (amiante) avant reprise.'
}, {
sit: 'Travail à l\'extérieur, exposé aux intempéries',
risk: 'Coup de chaleur, hypothermie, glissade par temps de pluie ou de gel',
g: 2,
mes: 'Règle d\'organisation retenue pour ce chantier : suivi de la météo et report des travaux d\'échafaudage ou de façade en cas de vent fort, gel ou forte pluie. Adaptation des horaires en période de forte chaleur.'
}]
},
'tailleur_pierre': {
extincteurs: ['poudreABC'],
materiel: ['trousse', 'dea', 'oculaire'],
label: 'Tailleur de pierre',
traits: ['nuisance','engin_lourd'],
epi: ['casque', 'gilet', 'chaussures', 'gants', 'lunettes', 'masqueFFP3', 'antibruit', 'genouill'],
risques: [{
sit: 'Sciage, meulage ou ponçage de pierre (naturelle ou reconstituée)',
risk: 'Silicose -- cancer bronchopulmonaire (CMR cat.1A, silice cristalline classée cancérogène groupe 1 CIRC)',
g: 5,
mes: 'Valeur limite réglementaire d\'exposition à la silice cristalline : 0,1 mg/m³ pour le quartz (R.4412-149) — exposition particulièrement élevée sur pierre reconstituée. Moyens de réduction et protection respiratoire à charge de l\'entreprise, précisés dans son PPSPS.'
}, {
sit: 'Utilisation de disqueuses, scies et outils de taille',
risk: 'Bruit > 85 dB(A) -- surdité professionnelle',
g: 3,
mes: 'Seuils réglementaires d\'exposition sonore (R.4431-2) : prévention dès 80 dB(A), protection auditive obligatoire dès 85 dB(A), valeur limite 87 dB(A). Protection auditive à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Utilisation prolongée d\'outils vibrants (marteau-piqueur, disqueuse, burin pneumatique)',
risk: 'Affections ostéo-articulaires et vasculaires liées aux vibrations, TMS du membre supérieur',
g: 3,
mes: 'Évaluation de l\'exposition vibratoire journalière à charge de l\'entreprise (DUERP) — valeur d\'action 2,5 m/s², valeur limite 5 m/s² pour les vibrations mains-bras (R.4443-1 et R.4443-2). Outillage anti-vibrations et organisation du travail déterminée en conséquence, précisée dans son PPSPS.'
}, {
sit: 'Manutention de blocs et éléments de pierre lourds',
risk: 'Lombalgies, écrasement, TMS',
g: 3,
mes: 'Port de charges limité par la loi à 55 kg pour un homme (105 kg avec avis d\'aptitude médicale), 25 kg pour une femme (R.4541-9). Aide mécanique à privilégier (R.4541-3 à R.4541-5). Moyens de manutention à charge de l\'entreprise, précisés dans son PPSPS.'
}, {
sit: 'Postures prolongées (agenouillé, penché) lors de la taille fine ou de la pose',
risk: 'TMS, bursite, tendinopathies',
g: 2,
mes: 'Organisation du travail (postures) à charge de l\'entreprise, précisée dans son PPSPS.'
}, {
sit: 'Restauration de monuments historiques -- patines ou traitements anciens contenant du plomb',
risk: 'Saturnisme -- CMR',
g: 3,
mes: 'Vérifier l\'existence et l\'adéquation d\'un repérage plomb au périmètre des travaux avant intervention. Protection respiratoire et hygiène à charge de l\'entreprise, précisées dans son PPSPS.'
}]
}
};
