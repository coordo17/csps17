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
# A) HTML : nouvelle carte "Site et secours" juste apres la carte Categorie
# ---------------------------------------------------------------------------
anchor_html = """            <div id="cat-warning" style="display:none;background:var(--orange);border-radius:6px;padding:10px 14px;font-size:13px;color:var(--orange-dark);margin-top:8px;"></div>
          </div>
        </div>

        <div class="form-card">
          <div class="form-card-header">&#128197; Suivi &amp; echeances (pour le tableau de bord)</div>"""
new_html = """            <div id="cat-warning" style="display:none;background:var(--orange);border-radius:6px;padding:10px 14px;font-size:13px;color:var(--orange-dark);margin-top:8px;"></div>
          </div>
        </div>

        <div class="form-card">
          <div class="form-card-header">&#127959; Site et secours (PGC &sect;4 et &sect;6)</div>
          <div class="form-card-body">
            <div class="organismes-note">Alimentent les sections 4 (interferences avec l'exploitation) et 6 (secours et evacuation) du PGC genere, ainsi que la fiche "En cas d'urgence" en annexe. Laissez vide/non coche si l'information n'est pas encore connue : rien n'est invente ni devine.</div>
            <div class="form-row">
              <div class="field" style="flex:1 1 100%;">
                <label style="display:flex;align-items:flex-start;gap:6px;font-size:13px;font-weight:400;cursor:pointer;margin-bottom:6px;"><input type="checkbox" id="site-exploitation"> Activite d'exploitation maintenue sur ou a proximite du site pendant les travaux</label>
                <label style="display:flex;align-items:flex-start;gap:6px;font-size:13px;font-weight:400;cursor:pointer;margin-bottom:6px;"><input type="checkbox" id="site-circulation"> Circulation publique a proximite (pietons, vehicules)</label>
                <label style="display:flex;align-items:flex-start;gap:6px;font-size:13px;font-weight:400;cursor:pointer;margin-bottom:6px;"><input type="checkbox" id="site-riverains"> Riverains / voisinage (habitations, commerces, ERP a proximite)</label>
              </div>
            </div>
            <div class="form-row">
              <div class="field"><label>Point(s) de rassemblement</label><input type="text" id="chantier-point-rassemblement" placeholder="Ex : Parking nord, entree principale"></div>
              <div class="field"><label>Etablissement de sante le plus proche</label><input type="text" id="chantier-hopital-proche" placeholder="Ex : CH Bretagne Atlantique, Vannes"></div>
            </div>
          </div>
        </div>

        <div class="form-card">
          <div class="form-card-header">&#128197; Suivi &amp; echeances (pour le tableau de bord)</div>"""
s = rep1(anchor_html, new_html, 'carte Site et secours (HTML)')

# ---------------------------------------------------------------------------
# B) collectFormData() : ajoute les nouveaux champs dans chantier{}
# ---------------------------------------------------------------------------
anchor_cfd = """      hj: document.getElementById('chantier-hj').value,
      nbEnt: document.getElementById('chantier-nb-ent').value,
    },"""
new_cfd = """      hj: document.getElementById('chantier-hj').value,
      nbEnt: document.getElementById('chantier-nb-ent').value,
      siteExploitation: document.getElementById('site-exploitation') ? document.getElementById('site-exploitation').checked : false,
      siteCirculation: document.getElementById('site-circulation') ? document.getElementById('site-circulation').checked : false,
      siteRiverains: document.getElementById('site-riverains') ? document.getElementById('site-riverains').checked : false,
      pointRassemblement: document.getElementById('chantier-point-rassemblement') ? document.getElementById('chantier-point-rassemblement').value : '',
      hopitalProche: document.getElementById('chantier-hopital-proche') ? document.getElementById('chantier-hopital-proche').value : '',
    },"""
s = rep1(anchor_cfd, new_cfd, 'collectFormData : nouveaux champs chantier')

# ---------------------------------------------------------------------------
# C) loadAffaire() : restaure les nouveaux champs
# ---------------------------------------------------------------------------
anchor_la = """  document.getElementById('chantier-nb-ent').value = c.nbEnt || '';
  var elMP = document.getElementById('mission-phase'); if (elMP) elMP.value = a.missionPhase || '';"""
new_la = """  document.getElementById('chantier-nb-ent').value = c.nbEnt || '';
  var elSE = document.getElementById('site-exploitation'); if (elSE) elSE.checked = !!c.siteExploitation;
  var elSC = document.getElementById('site-circulation'); if (elSC) elSC.checked = !!c.siteCirculation;
  var elSR = document.getElementById('site-riverains'); if (elSR) elSR.checked = !!c.siteRiverains;
  var elPR = document.getElementById('chantier-point-rassemblement'); if (elPR) elPR.value = c.pointRassemblement || '';
  var elHP = document.getElementById('chantier-hopital-proche'); if (elHP) elHP.value = c.hopitalProche || '';
  var elMP = document.getElementById('mission-phase'); if (elMP) elMP.value = a.missionPhase || '';"""
s = rep1(anchor_la, new_la, 'loadAffaire : restaure nouveaux champs chantier')

# ---------------------------------------------------------------------------
# D) corpsTableMatieresNatif() : le sommaire liste maintenant 4, 5, 6 aussi
# ---------------------------------------------------------------------------
anchor_sommaire = """    '3. Mesures de coordination (R.4532-44, 3°)',
    '7. Modalités de coopération entre les entrepreneurs, employeurs et travailleurs indépendants (R.4532-44, 7°)',"""
new_sommaire = """    '3. Mesures de coordination (R.4532-44, 3°)',
    '4. Interférences avec les activités d\\'exploitation (R.4532-44, 4° ; R.4532-14)',
    '5. Maintien du chantier en bon ordre et en état de salubrité (R.4532-44, 5°)',
    '6. Secours et évacuation des travailleurs (R.4532-44, 6°)',
    '7. Modalités de coopération entre les entrepreneurs, employeurs et travailleurs indépendants (R.4532-44, 7°)',"""
s = rep1(anchor_sommaire, new_sommaire, 'sommaire : sections 4/5/6')

# ---------------------------------------------------------------------------
# E) corpsAnnexeUrgenceNatif() : accepte desormais pointRassemblement/hopitalProche
# ---------------------------------------------------------------------------
anchor_urg = """function corpsAnnexeUrgenceNatif(nomChantier, adresseChantier){
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
  b += wH2('3. L\\'appel des secours');"""
new_urg = """function corpsAnnexeUrgenceNatif(nomChantier, adresseChantier, pointRassemblement, hopitalProche){
  var b = '';
  b += wH('Annexe 1 — Fiche \\'En cas d\\'urgence\\' (modèle OPPBTP)');
  b += wP('EN CAS D\\'URGENCE', {b:true,sz:64,color:'C00000',align:'center',title:true,spacing:80});
  b += wP('À compléter et afficher visiblement en base-vie. Rassembler ces informations avant d\\'appeler les secours.',{sz:18,spacing:80,color:'64748b',align:'center'});
  b += wH2('1. La nature de l\\'urgence');
  b += wP('Décrire les circonstances et les risques possibles : nature de l\\'accident (chute, ensevelissement, heurt, électrisation...), difficultés d\\'accès et de dégagement, nombre de victimes et leur état, intervention éventuelle d\\'un secouriste.',{sz:18,spacing:80,color:'475569'});
  b += wH2('2. Informations du chantier');
  b += wFL('Nom du chantier', nomChantier || '');
  b += wFL('Adresse', adresseChantier || '');
  b += wFL('Point(s) de rassemblement', pointRassemblement || '');
  b += wFL('Établissement de santé le plus proche', hopitalProche || '');
  b += wH2('3. L\\'appel des secours');"""
s = rep1(anchor_urg, new_urg, 'corpsAnnexeUrgenceNatif : point rassemblement + hopital')

# ---------------------------------------------------------------------------
# F) genererPGCNatif() : insere sections 4/5/6 entre section 3 et section 7,
#    et passe les nouveaux champs a corpsAnnexeUrgenceNatif
# ---------------------------------------------------------------------------
anchor_gen = """    body += corpsSection3PGCNatif(data, faits);

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
    body += corpsAnnexeDesignationSousTraitantNatif(c.nom);"""
new_gen = """    body += corpsSection3PGCNatif(data, faits);

    // [12/11, demande d'Alain, Etape 5 du portage PGC Harmo -> CSPS17] :
    // sections 4 (interferences avec activites d'exploitation), 5
    // (maintien en bon ordre/salubrite) et 6 (secours et evacuation),
    // pilotees par les nouveaux champs de la fiche affaire (case "Site et
    // secours" : site-exploitation/circulation/riverains, point de
    // rassemblement, etablissement de sante le plus proche). Puis section 7
    // (modalites de cooperation) et les 5 annexes, texte reglementaire fixe
    // repris d'Harmo -- portage desormais complet (sections 0 a 7 + annexes).
    body += corpsInterferencesExploitationNatif(c);
    body += corpsSalubriteNatif(data.entreprises);
    body += corpsSecoursEvacuationNatif(c);
    body += corpsModalitesCooperationNatif(data, faits);
    body += corpsAnnexeUrgenceNatif(c.nom, c.adresse, c.pointRassemblement, c.hopitalProche);
    body += corpsAnnexeTerrassementNatif();
    body += corpsAnnexeSanitairesNatif();
    body += corpsAnnexePPSPSNatif();
    body += corpsAnnexeDesignationSousTraitantNatif(c.nom);"""
s = rep1(anchor_gen, new_gen, 'genererPGCNatif : sections 4/5/6 + annexe urgence')

# ---------------------------------------------------------------------------
# G) Nouvelles fonctions corpsInterferencesExploitationNatif / corpsSalubriteNatif /
#    corpsSecoursEvacuationNatif, inserees juste avant genererPGCNatif
# ---------------------------------------------------------------------------
NEW_FUNCS = u'''
// [Portage PGC Etape 5 - 12/11, demande d'Alain] Section 4 : interferences
// avec les activites d'exploitation. Le maintien d'activite n'est affirme
// que si la case "site-exploitation" est cochee dans la fiche affaire
// (jamais devine) ; a defaut, le texte dit "a confirmer par le maitre
// d'ouvrage" -- meme logique de prudence qu'Harmo (commentaire du 23/09
// chez Harmo : "maintien de l'activite affirme SEULEMENT si un document le
// dit, sinon a confirmer").
function corpsInterferencesExploitationNatif(c){
  var b = '';
  b += wH('4. Interférences avec les activités d\\'exploitation (R.4532-44, 4° ; R.4532-14)');
  var cbExploit = !!(c && c.siteExploitation);
  var phraseICCE = 'le coordonnateur procède avec le chef d\\'établissement, préalablement au commencement des travaux, à une inspection commune (article R.4532-14 du Code du travail) visant à délimiter le chantier, matérialiser les zones présentant des dangers spécifiques et préciser les voies de circulation des entreprises, séparées de celles de la clientèle et du personnel du site. Les consignes arrêtées avec le chef d\\'établissement sont communiquées aux entreprises. Les mesures précises sont arrêtées à l\\'issue de cette inspection commune, avant le démarrage des travaux concernés. En complément du PPSPS, chaque entreprise établit et signe avec le chef d\\'établissement un plan de prévention (articles R.4512-6 et suivants du Code du travail), préalablement à toute intervention.';
  b += wP(cbExploit
    ? 'Une activité d\\'exploitation est maintenue sur ou à proximité du site pendant les travaux : ' + phraseICCE
    : 'Maintien de l\\'activité du site pendant les travaux : à confirmer par le maître d\\'ouvrage. S\\'il est confirmé, ' + phraseICCE,{sz:20,spacing:80,color:'475569'});
  var siteOuvertPublic = !!(c && c.siteCirculation) || !!(c && c.siteRiverains) || cbExploit;
  if(siteOuvertPublic){
    b += wP('Circulations et cheminements (article R.4532-44, 3° a) — à reporter sur le plan d\\'installation de chantier (PIC) :',{b:true,sz:20,spacing:40});
    b += wLi('Aires de circulation ouvertes au public (clientèle, voirie) : séparées de l\\'emprise du chantier par une clôture ou des barrières, la rubalise étant proscrite ; aucun survol de charge ni aucun empiètement du chantier sur ces aires.');
    b += wLi('Cheminements piétons : physiquement séparés des voies des véhicules et engins, balisés et maintenus pendant toute la durée des travaux ; en cas de déviation sur la voie publique, un cheminement d\\'au moins 1,40 m libre de tout obstacle est maintenu.');
    b += wP('Propreté des abords du chantier',{b:true,sz:20,spacing:40});
    b += wP('Pendant les phases de terrassement et de construction, les entreprises prennent les dispositions nécessaires pour limiter la propagation de poussières vers l\\'extérieur du chantier, assurer la rétention des boues et eaux de ruissellement sur son emprise, et empêcher la dispersion de déchets et détritus aux abords du site. Les engins et camions quittant le chantier sont nettoyés (roues, bas de caisse) chaque fois que nécessaire pour éviter tout dépôt sur la voirie publique.',{sz:20,spacing:80,color:'475569'});
  }
  b += wSep();
  return b;
}

// [Portage PGC Etape 5 - 12/11, demande d'Alain] Section 5 : maintien en bon
// ordre et salubrite. Tableau base-vie / entretien des locaux, meme
// structure 4 colonnes que le reste du PGC. La reserve demolition/
// desamiantage (VRS autonome) reutilise la meme detection par lot que la
// sujetion demolition du S3 (icMetiersDuLot) -- jamais affirmee a tort sur
// un chantier sans lot de demolition/desamiantage. Pas de chiffrage
// reglementaire (lavabos/cabinets) : hors role CSPS, meme decision qu'Harmo
// ("la responsabilite de la base vie est au lot qui la facture").
function corpsSalubriteNatif(entreprises){
  var b = '';
  b += wH('5. Maintien du chantier en bon ordre et en état de salubrité (R.4532-44, 5°)');
  b += wP('Le maître d\\'œuvre, en concertation avec le coordonnateur SPS, arrête les mesures permettant d\\'assurer le maintien du chantier en bon ordre et en état de salubrité satisfaisant pendant toute la durée des travaux (article R.4532-44 du Code du travail) : évacuation régulière des déchets et gravats, propreté des zones de circulation et des accès communs, entretien des installations communes.',{sz:20,spacing:120,color:'475569'});

  var lotDemolition = (entreprises || []).filter(function(e){ return icMetiersDuLot((e.lot || '') + ' ' + (e.nom || '')).indexOf('démolition_désamiantage') !== -1; });
  var parasBV = [];
  if(lotDemolition.length){
    parasBV.push({ text: 'NB — Période de démolition/désamiantage : le lot concerné reste indépendant en matière d\\'hygiène et dispose d\\'un système VRS autonome, conforme aux textes en vigueur.' });
  }
  parasBV.push({ text: 'Si du personnel féminin est présent sur le chantier, des vestiaires et sanitaires indépendants, munis d\\'un système de fermeture, lui sont réservés.' });
  parasBV.push({ text: 'La base-vie est dimensionnée en conséquence et peut évoluer en fonction de la courbe des effectifs.', b: true });
  parasBV.push({ text: 'L\\'ensemble des installations communes est chauffé, éclairé et équipé de prises de courant.' });
  var mettantBV = 'À définir avant la consultation des entreprises';
  var parasEntretienBV = [
    { text: 'Un nettoyage des locaux est assuré par une entreprise extérieure, à raison d\\'une fois par semaine au minimum.' },
    { text: 'Aucun repliement d\\'installations provisoires ne peut intervenir sans mise en place d\\'une installation équivalente.' }
  ];
  b += wTable(['Mesures de prévention','Sujétions du coordonnateur à respecter par les entreprises','Entreprise mettant en œuvre','Entreprise(s) bénéficiant'], [
    [{text:'Base-vie', b:true}, {paras:parasBV}, mettantBV, 'Ensemble des entreprises intervenantes'],
    [{text:'Entretien des locaux', b:true}, {paras:parasEntretienBV}, '—', 'Ensemble des entreprises intervenantes']
  ], [1800,4800,1200,1200]);
  b += wSep();
  return b;
}

// [Portage PGC Etape 5 - 12/11, demande d'Alain] Section 6 : secours et
// evacuation. Les renseignements pratiques (adresse, point de
// rassemblement, hopital) sont repris directement des champs de la fiche
// affaire -- aucune ligne inventee, une ligne vide est simplement omise
// (meme garde-fou qu'Harmo). Le tableau "Consignes generales..." est du
// texte reglementaire fixe, identique quel que soit le chantier. Le bloc
// dynamique "Observations relevees sur les plans" d'Harmo (categorie
// securite_incendie du moteur de regles des plans) n'est pas repris : CSPS17
// n'a plus de lecture IA des plans (retiree, confirme par Alain le 12/11).
function corpsSecoursEvacuationNatif(c){
  var b = '';
  b += wH('6. Secours et évacuation des travailleurs (R.4532-44, 6°)');
  var lignesSecours = [
    ['Adresse d\\'accès des secours', c && c.adresse],
    ['Point(s) de rassemblement', c && c.pointRassemblement],
    ['Établissement de santé le plus proche', c && c.hopitalProche]
  ].filter(function(l){ return l[1] && String(l[1]).trim(); });
  b += wP('Renseignements pratiques propres au lieu de l\\'opération',{b:true,sz:20,spacing:40});
  lignesSecours.forEach(function(l){ b += wFL(l[0], String(l[1]).trim()); });
  b += wFL('Numéros d\\'urgence', 'SAMU 15 — Pompiers 18 — Police 17 — Numéro d\\'urgence européen 112');
  b += wP('Ces renseignements sont repris dans la fiche « En cas d\\'urgence » jointe en annexe, à afficher en base-vie.',{sz:20,spacing:100});

  b += wTable(['Point','Dispositions'], [
    [{text:'Consignes générales et organisation des secours', b:true}, {paras:[
      {text:'Les consignes de sécurité sont affichées sur l\\'ensemble du site et portées à la connaissance de chaque travailleur lors de l\\'accueil sécurité. Un téléphone, fixe ou mobile, est en permanence sur le chantier pour organiser les secours avant l\\'arrivée des services extérieurs. Les voies de circulation restent dégagées pour garantir l\\'accès des secours jusqu\\'aux zones de travail. En cas d\\'accident ou de situation grave, l\\'alerte est donnée immédiatement et la zone évacuée sans délai. La reprise des travaux n\\'intervient qu\\'après concertation des parties concernées.'}
    ]}],
    [{text:'Procédure en cas d\\'accident', b:true}, {paras:[
      {text:'Accident bénin : le blessé est pris en charge sur place par un secouriste, ou évacué vers un cabinet médical ou l\\'hôpital le plus proche.'},
      {text:'Accident grave : appeler le 18, se conformer à la fiche « En cas d\\'urgence ». Le blessé n\\'est manipulé que par un secouriste ; les secours appellent le SAMU ou évacuent. Le transport à domicile relève de la décision de l\\'entreprise, en accord avec un médecin.'}
    ]}],
    [{text:'Déclaration des accidents', b:true}, {paras:[
      {text:'Le coordonnateur SPS est informé sans délai de tout accident, avec ou sans arrêt de travail, et reçoit deux exemplaires de la fiche d\\'accident. En cas d\\'accident grave, le rapport d\\'enquête est transmis par l\\'agent de sécurité de l\\'entreprise ou le CISSCT. En cas de décès, l\\'employeur informe l\\'inspection du travail sous douze heures (article R.4121-5). Les autres déclarations restent à la charge de l\\'employeur.'}
    ]}],
    [{text:'Secouriste et moyens de premiers secours', b:true}, {paras:[
      {text:'Un secouriste au moins est formé sur tout chantier de vingt travailleurs ou plus, pendant plus de quinze jours, avec travaux dangereux (article R.4224-15). Chaque entreprise détermine ensuite son propre nombre de SST selon son effectif et ses risques. Chaque entreprise dispose d\\'une trousse de premiers secours et, en cas de risque incendie, d\\'un ou plusieurs extincteurs vérifiés annuellement (NF S 61-919, APSAD R4). Les locaux communs — stockage, vestiaires, réfectoire — sont également équipés d\\'un extincteur. Chaque entreprise forme ses salariés à son utilisation.'},
      {text:'Une liste à jour des sauveteurs secouristes du travail (SST) présents sur le chantier, mentionnant leur nom, est affichée en base-vie. Les SST sont reconnaissables au logo SST placé sur leur casque et leur tenue de travail.'}
    ]}],
    [{text:'Interventions isolées interdites', b:true}, {paras:[
      {text:'Aucune intervention seule, sans moyen de communication ni surveillance, sur une opération dangereuse :'},
      {text:'– Levage de charges (article R.4323-41 du Code du travail)'},
      {text:'– Travail temporaire en hauteur avec équipement de protection individuelle contre les chutes (article R.4323-61)'},
      {text:'– Intervention en galerie souterraine ou en puits (article R.4534-51)'},
      {text:'– Travaux au voisinage de parties actives nues sous tension des domaines HTA ou HTB (article R.4544-6)'},
      {text:'– Travaux en milieu hyperbare (articles R.4461-1 et suivants)'},
      {text:'– Intervention sur ascenseurs et monte-charges (articles R.4543-19 à R.4543-21)'},
      {text:'– Emploi d\\'explosifs'}
    ]}],
    [{text:'Accès au chantier', b:true}, {paras:[
      {text:'Le maître d\\'ouvrage, le maître d\\'œuvre et le coordonnateur SPS peuvent interdire l\\'entrée du chantier à toute personne en contravention avec la réglementation en vigueur.'}
    ]}]
  ], [2200,6800]);
  b += wSep();
  return b;
}

'''

anchor_c = "// genererPGCNatif(ref) : ref vaut 'PGCR' (PGC complet, Cat.1-2) ou 'PGC3R'"
s = rep1(anchor_c, NEW_FUNCS + anchor_c, 'insertion des fonctions etape 5')

with io.open(PATH, 'w', encoding='utf-8', newline='\n') as f:
    f.write(s)
print('OK etape5 inserted, new length =', len(s))
