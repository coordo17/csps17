/* =======================================================================
   SAVOIR CSPS — base de connaissances de Sami
   -----------------------------------------------------------------------
   Ce fichier est FAIT POUR ETRE MODIFIE PAR ALAIN.
   Il se pose a la racine du depot csps17 (a cote de index.html).
   Le serveur le sert automatiquement : aucune modification de server.js.

   Trois blocs :
     SAVOIR_CSPS.socle    -> toujours envoye a Sami (reglementaire, court)
     SAVOIR_CSPS.metiers  -> envoye SEULEMENT si le metier est concerne
     SAVOIR_CSPS.themes   -> envoye SEULEMENT si le theme est evoque

   Regle d'or : on garde le socle COURT. Tout ce qui est ponctuel va dans
   metiers/themes, sinon chaque reponse de Sami devient lente.

   Sources verifiees : Code du travail R.4532-1 a R.4532-98,
   arrete du 25 fevrier 2003 (liste L.4532-8), INRS coordination SPS.
   Derniere verification : 20 juillet 2026.
   ======================================================================= */

window.SAVOIR_CSPS = {

  version: '1.0 — 20/07/2026',

  /* ------------------------------------------------------------------
     1. SOCLE — toujours transmis
     ------------------------------------------------------------------ */
  socle: [
    'CATEGORIES D\'OPERATION (R.4532-1)',
    '- Categorie 1 : plus de 10 000 hommes-jours (environ 80 000 h) avec au moins 10 entreprises en batiment ou 5 en genie civil. CISSCT obligatoire (R.4532-77).',
    '- Categorie 2 : plus de 500 hommes-jours (environ 4 000 h), ou chantier de 30 jours avec effectif de pointe superieur a 20 salaries, hors categorie 1. Declaration prealable obligatoire.',
    '- Categorie 3 : toutes les autres. PGC simplifie uniquement si l\'operation comporte des travaux a risques particuliers (R.4532-52 et R.4532-54).',
    '',
    'DOCUMENTS ET QUI FAIT QUOI',
    '- PGC : redige par le CSPS des la conception, en concertation avec la maitrise d\'oeuvre. Obligatoire en categories 1 et 2. Joint au dossier de consultation des entreprises. Tenu a jour pendant toute l\'operation.',
    '- PGC simplifie : categorie 3 avec travaux a risques particuliers. Ne traite que les interferences liees aux travaux dangereux.',
    '- PPSPS : redige par CHAQUE entreprise, sous-traitants compris, sur tout chantier soumis a PGC. Delai : 30 jours minimum a compter de la reception du contrat signe ; reduit a 8 jours pour le second oeuvre en batiment et pour les lots ou travaux accessoires en genie civil, SAUF s\'ils figurent sur la liste des travaux a risques particuliers (R.4532-62). Le PPSPS du gros oeuvre ou du lot principal est communique a l\'inspection du travail, aux services prevention de la securite sociale et a l\'OPPBTP. Consultable par le CISSCT, le CSE et le medecin du travail.',
    '- Registre-journal (R.4532-38 a R.4532-41) : ouvert et tenu par le CSPS des la passation de son contrat. Il consigne les comptes rendus de reunions et d\'inspections communes, les observations et notifications adressees aux intervenants et leurs reponses, les passations de consignes, la transmission du DIUO. C\'est la piece maitresse en cas de litige : ce qui n\'y est pas ecrit n\'a pas eu lieu.',
    '- DIUO : constitue des la conception, complete en cours de chantier, remis au maitre d\'ouvrage en fin d\'operation, joint aux actes notaries a chaque mutation. Contient notamment les dispositions pour l\'entretien en facade et en couverture, l\'acces aux locaux techniques, et le dossier technique amiante.',
    '- Inspection commune : conduite sur site a l\'initiative du CSPS, avec CHAQUE entreprise y compris sous-traitante, AVANT son intervention et avant remise de son PPSPS. Elle precise les consignes, les moyens mis en commun et les mesures liees a la co-activite.',
    '- CISSCT : categorie 1. Constitue par le maitre d\'ouvrage, preside par le CSPS. Reuni chaque trimestre des lors que 2 entreprises sont presentes, et en dehors des seances sur demande de ses membres ou apres un accident grave ou qui aurait pu l\'etre.',
    '- Etablissement en activite : inspection commune prealable avec le chef d\'etablissement pour delimiter le chantier, materialiser les zones dangereuses, definir les circulations et, en chantier non clos et non independant, les installations sanitaires, vestiaires et locaux de restauration.',
    '',
    'TRAVAUX A RISQUES PARTICULIERS — liste de l\'arrete du 25 fevrier 2003 (article L.4532-8). C\'est elle qui declenche le PGC simplifie en categorie 3 et qui interdit le delai reduit de 8 jours pour le PPSPS.',
    '1. Risques particulierement aggraves exposant a une chute de hauteur de plus de 3 metres, ou a un risque d\'ensevelissement ou d\'enlisement.',
    '2. Exposition a des substances chimiques ou agents biologiques necessitant une surveillance medicale.',
    '3. Retrait ou confinement d\'amiante friable.',
    '4. Exposition a des radiations ionisantes en zone controlee ou surveillee.',
    '5. Contact avec des pieces nues sous tension superieure a la TBT, et travaux a proximite de lignes HTB aeriennes ou enterrees.',
    '6. Risque de noyade.',
    '7. Puits, terrassements souterrains, tunnels, reprises en sous-oeuvre.',
    '8. Travaux en plongee appareillee.',
    '9. Travaux en milieu hyperbare.',
    '10. Demolition, deconstruction, rehabilitation touchant les structures porteuses d\'un ouvrage de plus de 200 metres cubes hors oeuvre.',
    '11. Usage d\'explosifs.',
    '12. Montage ou demontage d\'elements prefabriques lourds.',
    '13. Appareils de levage d\'une capacite superieure a 60 t/m (grues mobiles, grues a tour).',
    '',
    'CO-ACTIVITE — le coeur du metier',
    '- Risque importe : ce que les autres entreprises font subir a celle qui intervient. Risque exporte : ce que ses propres travaux font subir aux autres. Toute inspection commune doit trancher les deux sens.',
    '- Points d\'interference a examiner systematiquement : phasage et simultaneite, circulations et acces communs, zones de stockage, moyens de levage partages, echafaudages et protections collectives mutualisees, alimentation electrique de chantier, base vie, evacuation des dechets, travaux par points chauds, coupures de reseaux.',
    '- Une protection collective retiree par une entreprise pour son travail est le premier generateur d\'accident pour la suivante. Le retrait doit etre trace au registre-journal et sa restitution verifiee.'
  ].join('\n'),

  /* ------------------------------------------------------------------
     2. METIERS — transmis seulement si le corps d'etat est concerne
     Format : risques dominants / EPI attendus / a controler en visite
     ------------------------------------------------------------------ */
  metiers: {
    'gros oeuvre': 'GROS OEUVRE / MACONNERIE. Risques : chute de hauteur en rive de dalle et tremie, effondrement de banches et d\'etaiement, ensevelissement en fouille, heurt par charge levee, ecrasement, poussieres de silice cristalline (sciage, percage, demolition), bruit, TMS, ciment (dermatoses). EPI : casque jugulaire, chaussures S3, gants, lunettes, protection auditive, masque FFP3 en decoupe, harnais si protection collective impossible. A controler : garde-corps continus en rive et tremies protegees, stabilite et lestage des banches, conformite de l\'etaiement, blindage des fouilles au-dela de 1,30 m, elingage et etat des accessoires de levage, plan de circulation des engins, protection contre les chutes d\'objets.',

    'charpente couverture': 'CHARPENTE / COUVERTURE. Risques : chute de hauteur et chute a travers materiau fragile (plaques fibrociment, tolerie translucide, verriere), chute d\'objets, vent, effondrement de charpente en cours de montage, amiante en couverture ancienne. EPI : harnais avec point d\'ancrage identifie, casque jugulaire, chaussures antiderapantes. A controler : filets ou plateformes en sous-face, echafaudage de pied ou garde-corps peripherique, ligne de vie et points d\'ancrage justifies, reperage amiante prealable avant toute intervention sur couverture ancienne, arret des travaux au-dela des seuils de vent, contreventement provisoire de la charpente.',

    'electricite': 'ELECTRICITE. Risques : contact direct ou indirect, arc electrique et brulure, chute de hauteur en pose de chemins de cables, coactivite avec le second oeuvre, travaux a proximite de lignes aeriennes ou de reseaux enterres. EPI : gants isolants adaptes a la tension, ecran facial, vetements sans partie conductrice, chaussures isolantes. A controler : habilitation electrique a jour et adaptee (B0, B1V, B2V, BR, BC), consignation formalisee avec attestation, VAT avant intervention, armoire de chantier conforme et protegee (30 mA), DT-DICT realisees, distances de securite aux lignes HTA/HTB, rangement des enrouleurs hors zone de circulation et d\'eau.',

    'plomberie chauffage': 'PLOMBERIE / CHAUFFAGE / SANITAIRE. Risques : travaux par points chauds et incendie, brulure, espace confine (vide sanitaire, gaine), manutention de charges, coupure, amiante sur calorifuge ancien, legionelle en remise en eau. EPI : gants anti-coupure, lunettes, masque adapte, ecran facial en soudure. A controler : permis de feu signe et extincteur a poste, surveillance apres travaux par points chauds, ventilation et surveillance exterieure en espace confine, reperage amiante avant depose de calorifuge, purge et consignation des reseaux.',

    'menuiserie': 'MENUISERIE / AGENCEMENT. Risques : coupure et sectionnement sur machines portatives, projection, poussieres de bois (cancerogene), bruit, manutention d\'ouvrants lourds, chute de hauteur en pose de menuiserie exterieure, chute de l\'ouvrant lui-meme. EPI : gants anti-coupure, lunettes, protection auditive, masque a poussieres. A controler : protecteurs de machines en place, aspiration a la source, calage et stockage vertical securise des menuiseries, moyens de manutention adaptes, protection des baies avant depose de l\'ancienne menuiserie.',

    'platrerie isolation': 'PLATRERIE / ISOLATION / CLOISONS. Risques : chute de hauteur sur echafaudage roulant et PIRL, poussieres de platre et fibres minerales, TMS et travail bras leves, coupure, espace encombre. EPI : masque FFP2 minimum, lunettes, gants, protection auditive en decoupe. A controler : stabilisateurs deployes et roues bloquees sur echafaudage roulant, absence de travail depuis un escabeau, ventilation des locaux, gestion des chutes de materiaux, eclairage suffisant.',

    'peinture': 'PEINTURE / REVETEMENTS. Risques : agents chimiques (solvants, isocyanates), incendie et atmosphere explosive en local ferme, chute de hauteur, TMS, plomb en decapage de peinture ancienne. EPI : masque a cartouche adaptee, gants chimiques, lunettes, combinaison. A controler : fiches de donnees de securite disponibles, ventilation mecanique en local ferme, interdiction de tout point chaud pendant l\'application de produits inflammables, CREP ou reperage plomb avant decapage, stockage des produits en retention.',

    'carrelage': 'CARRELAGE / SOLS. Risques : silice cristalline en decoupe, TMS et genoux, coupure, glissade sur sol humide, produits de ragréage. EPI : genouilleres, gants, lunettes, masque FFP3 en decoupe a sec. A controler : decoupe a l\'eau ou aspiration a la source, balisage des zones fraiches et humides, acces interdits pendant sechage, manutention des palettes de carrelage.',

    'etancheite': 'ETANCHEITE. Risques : chute de hauteur en rive et sur toiture-terrasse, points chauds au chalumeau et incendie, brulures, produits bitumineux et HAP, vent. EPI : gants anti-chaleur, chaussures adaptees, harnais si necessaire, masque en cas de fumees. A controler : garde-corps peripherique ou ligne de vie, permis de feu et ronde apres travaux, absence de materiau combustible en sous-face, protection des edicules et lanterneaux (risque de chute a travers), stockage des bouteilles de gaz.',

    'vrd terrassement': 'VRD / TERRASSEMENT / RESEAUX. Risques : ensevelissement en tranchee, heurt engin-pieton, endommagement de reseaux existants (electricite, gaz), chute dans la fouille, bruit et vibrations, circulation publique. EPI : gilet haute visibilite, casque, chaussures S3, protection auditive. A controler : DT-DICT et marquage-piquetage, blindage ou talutage au-dela de 1,30 m de profondeur, distance de depot des deblais au bord de fouille, echelle d\'acces depassant d\'un metre, separation des flux engins et pietons, avertisseur de recul et angles morts, balisage vis-a-vis des tiers.',

    'demolition': 'DEMOLITION / DECONSTRUCTION. Risques : effondrement non maitrise, chute de hauteur et dans les vides, amiante, plomb, HAP, silice, bruit et vibrations, projection, incendie. EPI : selon reperage (jusqu\'a masque a ventilation assistee et combinaison type 5 en sous-section 3). A controler : reperage amiante avant travaux et reperage plomb obligatoires AVANT tout demarrage, plan de demolition et ordre de deconstruction, verification de la stabilite des structures restantes, arrosage anti-poussiere, tri et evacuation des dechets avec bordereaux, perimetre de securite vis-a-vis des tiers. Rappel : au-dela de 200 metres cubes hors oeuvre touchant les structures porteuses, c\'est un travail a risques particuliers.',

    'levage': 'LEVAGE / GRUE. Risques : chute de charge, renversement de l\'appareil, heurt, interference entre grues, survol de zones occupees ou de la voie publique, vent. EPI : casque, gants, gilet haute visibilite. A controler : rapport de verification de mise en service et verifications periodiques, certificat d\'aptitude a la conduite (CACES ou equivalent) et autorisation de conduite, plan de levage pour les operations delicates, zone d\'interdiction de survol, etat des elingues et accessoires, anemometre et seuils de vent, consignation en girouette hors service, coordination des grues en cas d\'interference. Au-dela de 60 t/m : travail a risques particuliers.',

    'echafaudage': 'ECHAFAUDAGE. Risques : chute de hauteur au montage et au demontage, effondrement, chute d\'objets, defaut d\'ancrage. A controler : montage par personnel forme et competent, note de calcul ou conformite a une notice, examen d\'adequation, examen de montage et d\'installation, verifications journalieres et trimestrielles consignees, plinthes et garde-corps complets, planchers jointifs sans trou, acces par escalier ou trappe, ancrages en nombre, protection contre les chutes d\'objets, panneau d\'interdiction pendant le montage.',

    'metallerie serrurerie': 'METALLERIE / SERRURERIE / CHARPENTE METALLIQUE. Risques : chute de hauteur au montage, chute de la structure en cours d\'assemblage, points chauds et incendie, projection et brulure, manutention d\'elements lourds, coupure. EPI : ecran facial de soudage, gants cuir, vetements ignifuges, harnais. A controler : stabilite provisoire et contreventement, permis de feu, elingage et guidage des elements, plateformes de travail ou nacelle plutot que travail sur structure, protection des tiers en sous-face.'
  },

  /* ------------------------------------------------------------------
     3. THEMES — transmis seulement si le sujet est evoque
     ------------------------------------------------------------------ */
  themes: {
    amiante: 'AMIANTE. Deux regimes : sous-section 3 (retrait, encapsulage — entreprise certifiee, plan de retrait transmis 1 mois avant, confinement, decontamination) et sous-section 4 (interventions susceptibles de liberer des fibres sur materiaux en place — mode operatoire, formation adaptee). Avant tout chantier : DTA pour les parties communes et reperage avant travaux (RAT) a la charge du maitre d\'ouvrage. Le retrait ou confinement d\'amiante friable figure a la liste des travaux a risques particuliers. En visite : verifier l\'existence du reperage AVANT le demarrage, la certification de l\'entreprise, l\'affichage de la zone, les moyens de decontamination et l\'evacuation en dechets dangereux avec bordereau.',

    plomb: 'PLOMB. CREP obligatoire pour les logements construits avant 1949 ; reperage plomb avant travaux pour les operations touchant des peintures anciennes. Risques : intoxication par inhalation de poussieres et ingestion, particulierement en decapage thermique ou mecanique. En visite : verifier le reperage, l\'interdiction de decapage thermique sans protection, l\'hygiene (interdiction de manger et fumer en zone, lavage des mains, vestiaires separes), le suivi medical renforce.',

    silice: 'SILICE CRISTALLINE. Cancerogene depuis 2020 pour les procedes generant des poussieres. Concernee des qu\'on scie, perce, ponce ou demolit beton, mortier, pierre, brique, carrelage. Priorite : travail a l\'eau ou aspiration a la source, jamais le masque seul. En visite : verifier la captation a la source, le FFP3 en complement, l\'absence de balayage a sec, le nettoyage par aspirateur de classe H.',

    'chute de hauteur': 'CHUTE DE HAUTEUR — premiere cause d\'accident mortel dans le BTP. Ordre de priorite non negociable : suppression du travail en hauteur, puis protection collective permanente, puis protection collective temporaire (garde-corps, filets), puis equipement de travail adapte (echafaudage, PEMP), et en dernier recours seulement la protection individuelle avec point d\'ancrage justifie et procedure de secours. L\'echelle et l\'escabeau sont des moyens d\'acces, pas des postes de travail. Au-dela de 3 metres, on entre dans les travaux a risques particuliers.',

    'base vie': 'BASE VIE ET HYGIENE (R.4534-138 et suivants). A verifier : vestiaires avec armoires individuelles fermant a cle, refectoire ou local de restauration chauffe, sanitaires en nombre suffisant et separes par sexe, eau potable fraiche, moyens de lavage des mains, local de decontamination si travaux amiante ou plomb. En operation avec plusieurs entreprises, la mutualisation des installations releve du PGC et doit etre tranchee en inspection commune, avec la date de mise en service.',

    meteo: 'ALEAS CLIMATIQUES. Vent : arret des travaux de levage et en hauteur selon les seuils fixes par les notices constructeur, mise en girouette des grues. Canicule : adaptation des horaires, eau fraiche, zones ombragees, vigilance renforcee sur le travail isole ; le risque est reconnu au titre des intemperies BTP. Gel et verglas : glissade, chute, prise du beton. Orage : interdiction des travaux en hauteur et sur structures metalliques. Ces aleas doivent figurer au PGC et etre reevalues en visite.',

    'espace confine': 'ESPACE CONFINE. Risques : anoxie, atmosphere toxique ou explosive, noyade, difficulte d\'evacuation. Exigences : autorisation de penetrer, controle d\'atmosphere prealable et continu, ventilation forcee, surveillant exterieur permanent, moyens de recuperation (trepied, harnais), procedure de secours ecrite et testee. En visite : verifier le mode operatoire ecrit, la presence effective du surveillant et le materiel de detection etalonne.',

    'travailleur isole': 'TRAVAILLEUR ISOLE. A eviter par principe sur les taches a risque. Si inevitable : dispositif d\'alarme pour travailleur isole, procedure d\'alerte et frequence de contact definies, interdiction stricte des travaux dangereux en isolement (hauteur, espace confine, electricite sous tension, points chauds).',

    'danger grave imminent': 'DANGER GRAVE ET IMMINENT. Le CSPS qui constate un danger grave et imminent le consigne IMMEDIATEMENT au registre-journal, alerte l\'entreprise concernee et le maitre d\'ouvrage par ecrit, et demande l\'arret de la tache concernee. Le CSPS n\'a pas pouvoir d\'arreter le chantier lui-meme : c\'est le maitre d\'ouvrage ou l\'inspection du travail. La trace ecrite immediate est la protection juridique du coordonnateur.'
  }
};
