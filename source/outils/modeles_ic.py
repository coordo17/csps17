# Fiche IC v17 (Cat. 1-2) et v6 (Cat. 3) — decisions d'Alain 30/09 soir
import copy, sys
from edit_docx import Doc, q, table, para, run
from lxml import etree
def txt(e): return ''.join(t.text or '' for t in e.iter(q('t')))
def body_tables(d): return [el for el in d.root.find(q('body')) if el.tag==q('tbl')]
def tbl_with(d, s):
    r=[t for t in body_tables(d) if s in txt(t)]; assert len(r)==1,(s,len(r)); return r[0]
def set_cell(tc, s):
    ps=tc.findall(q('p')); p=ps[0]
    for extra in ps[1:]: tc.remove(extra)
    ts=list(p.iter(q('t')))
    if ts:
        ts[0].text=s; ts[0].set('{http://www.w3.org/XML/1998/namespace}space','preserve')
        for t in ts[1:]:
            r=t.getparent(); r.getparent().remove(r)
    elif s:
        p.append(etree.fromstring(run(s).replace('<w:r>','<w:r xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',1)))

src, out = sys.argv[1], sys.argv[2]
d=Doc(src+'/Fiche_IC_Vierge_CSPS17_v16.docx')
d.rep('Raison sociale :', 'Raison sociale : {{moa_nom}}')
# Case a cocher APRES le libelle (31/10, demande d'Alain : "la logique serait
# Cat.1 validation Cat.2 validation Cat.3 validation, pas la validation avant
# la categorie, c'est trompeur") -- coherent avec cocherCategorie()/le bloc
# inline de complet/index.html, mis a jour dans le meme sens.
d.rep('☐ Cat. 1 ☐ Cat. 2 ☐ Cat. 3', 'Cat. 1 ☐  Cat. 2 ☐  Cat. 3 ☐')
d.rep('Représentant :', 'Représentant : {{moa_contact}}')
d.rep('Tél :', 'Tél : {{moa_tel}}')
d.rep('n° ____ n° ____', 'n° ____')
d.rep("Les risques propres à l'entreprise figureront dans son PPSPS.", "Les risques propres à l'entreprise sont relevés en 7D et détaillés dans son PPSPS (R.4532-66).")
# [Retrait PPSPS-recu de l'IC - 31/10, demande d'Alain] "hors si le PPSPS
# se fait apres l'IC, pourquoi en parler la, c'est faux" -- le PPSPS
# est elabore APRES l'inspection commune (elle y contribue, cf. INRS/
# CRAMIF), pas avant : cette ligne dans "4. Informations prealables
# recues de l'EE" faisait croire le contraire. Retiree purement et
# simplement (option 1 d'Alain) ; le suivi reel du PPSPS se fait dans
# la grille d'analyse des PPSPS (document separe, v5 validee le 02/10).
# La version Cat.3 n'est pas concernee : elle place deja ce point sous
# "Formalites obligatoires avant demarrage", en engagement a venir
# ("PPSPS simplifie (integrant les risques de cette IC)"), pas en
# information recue au prealable -- formulation correcte, inchangee.
t4 = tbl_with(d, 'PPSPS transmis au CSPS')
for tr in t4.findall(q('tr')):
    if 'PPSPS transmis au CSPS' in txt(tr):
        t4.remove(tr); break
# 7A / 7B / 7C : une seule ligne de donnees vide (l'appli la duplique)
for anc in ['7A — Co-activité', '7B — Risques importés', '7C — Risques exportés']:
    t=tbl_with(d, anc); trs=t.findall(q('tr'))
    for tc in trs[2].findall(q('tc')): set_cell(tc,'')
    for tr in trs[3:]: t.remove(tr)
# 7D : copie de 7C
t7c=tbl_with(d,'7C — Risques exportés'); t7d=copy.deepcopy(t7c)
trs=t7d.findall(q('tr'))
set_cell(trs[0].findall(q('tc'))[0], "7D — Risques propres à l'entreprise (travaux confiés) — R.4532-66")
for tc,s in zip(trs[1].findall(q('tc')), ['Risque propre (origine)', "Mesure annoncée par l'entreprise", 'À reporter au PPSPS']): set_cell(tc,s)
t7c.addnext(t7d)
sp=etree.fromstring(para([run(' ', sz=8)], before=0, after=0)); t7c.addnext(sp)
# Section 3 (ETABLISSEMENT EN ACTIVITE / EXPLOITANT, R.4532-14) - completee le
# 31/10 (demande d'Alain : "pour la 1, complete la stp") : la colonne ne
# portait que des champs d'identification, sans le contenu legal de R.4532-14
# (1 degre : delimitation du chantier, zones dangereuses, voies de
# circulation, acces sanitaires/vestiaires/restauration de l'etablissement si
# chantier non clos/independant ; 2 degre : consignes de securite + organi-
# sation des premiers secours de l'etablissement, transmises par le chef
# d'etablissement). On utilise les 3 lignes jusque-la vides de la colonne
# droite (Travaux confies / Periode-Effectif / Sous-traitants n'ont pas
# d'equivalent cote etablissement).
tEtab = tbl_with(d, 'Désignation / R. sociale')
trsEtab = tEtab.findall(q('tr'))
for idx, lab in [(4, 'Délimitation / signalisation / voies circulation'),
                  (5, 'Accès sanitaires-vestiaires-restauration établ. (si non clos)'),
                  (6, 'Consignes sécurité & secours établ. transmis')]:
    set_cell(trsEtab[idx].findall(q('tc'))[2], lab)

# 11 : vigilance meteorologique - reduite le 31/10 (demande d'Alain : "pour la
# 2, reduit la elle est deja dans le PGC, fait y reference") : la grille
# canicule/intemperies complete faisait doublon avec le PGC SPS qui la
# detaille deja. On ne garde que l'essentiel propre a cette IC (confirmation
# d'application + referents nommes) ; le reste est renvoye au PGC via le
# titre de la section.
d.rep('11. VIGILANCE MÉTÉOROLOGIQUE', '11. VIGILANCE MÉTÉOROLOGIQUE (détail : PGC SPS)')
tMeteo = tbl_with(d, 'Eau fraîche en permanence')
trsMeteo = tMeteo.findall(q('tr'))
set_cell(trsMeteo[1].findall(q('tc'))[4], 'Mesures canicule/intempéries appliquées (PGC SPS) :')
set_cell(trsMeteo[2].findall(q('tc'))[4], 'Référent canicule — Nom :')
set_cell(trsMeteo[3].findall(q('tc'))[4], 'Référent intempéries — Nom :')
for idx in (4, 5):
    tcsMeteo = trsMeteo[idx].findall(q('tc'))
    for k in (4, 5, 6):
        set_cell(tcsMeteo[k], '')
# Separation §13/§14 (31/10, demande d'Alain : "long difficile a lire ...
# je pense qu'il faut separer 13. OBSERVATIONS DU CSPS et 14. REUNIONS /
# COORDINATION, pour aerer le 13") : les deux sections partageaient un
# tableau cote a cote (demi-largeur chacune), rendant §13 (observations,
# souvent du texte libre) trop etroit et dense. On les separe en deux
# blocs pleine largeur independants, memes couleurs/contenu.
NSDECL = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
BORD13 = '<w:tblBorders>' + ''.join('<w:%s w:val="single" w:sz="4" w:space="0" w:color="auto"/>' % s for s in ['top','left','bottom','right','insideH','insideV']) + '</w:tblBorders>'
CELLMAR13 = '<w:tblCellMar><w:left w:w="10" w:type="dxa"/><w:right w:w="10" w:type="dxa"/></w:tblCellMar>'
LOOK13 = '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
SPACER13 = '<w:p %s/>' % NSDECL

def _hdr13(titre):
    return (('<w:tbl %s><w:tblPr><w:tblW w:w="9640" w:type="dxa"/>%s%s%s</w:tblPr>'
             '<w:tblGrid><w:gridCol w:w="9640"/></w:tblGrid>'
             '<w:tr><w:tc><w:tcPr><w:tcW w:w="9640" w:type="dxa"/>'
             '<w:tcBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="1F4E79"/><w:left w:val="single" w:sz="8" w:space="0" w:color="1F4E79"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="1F4E79"/><w:right w:val="single" w:sz="8" w:space="0" w:color="1F4E79"/></w:tcBorders>'
             '<w:shd w:val="clear" w:color="auto" w:fill="1F4E79"/>'
             '<w:tcMar><w:top w:w="70" w:type="dxa"/><w:left w:w="150" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="150" w:type="dxa"/></w:tcMar>'
             '<w:vAlign w:val="center"/></w:tcPr>'
             '<w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:color w:val="FFFFFF"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr><w:t>%s</w:t></w:r></w:p>'
             '</w:tc></w:tr></w:tbl>') % (NSDECL, BORD13, CELLMAR13, LOOK13, titre.replace('&','&amp;')))

def _row13(label, fill, bold, labcol):
    labp = '<w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/>%s<w:color w:val="%s"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>%s</w:t></w:r></w:p>' % ('<w:b/><w:bCs/>' if bold else '', labcol, label.replace('&','&amp;'))
    tc1 = '<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:left w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:right w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="%s"/><w:tcMar><w:top w:w="55" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="55" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>%s</w:tc>' % (fill, labp)
    tc2 = '<w:tc><w:tcPr><w:tcW w:w="6640" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:left w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:right w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcMar><w:top w:w="55" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="55" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tcMar></w:tcPr><w:p/></w:tc>'
    return '<w:tr>' + tc1 + tc2 + '</w:tr>'

def _data13(rows):
    x = '<w:tbl %s><w:tblPr><w:tblW w:w="9640" w:type="dxa"/>%s%s%s</w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="6640"/></w:tblGrid>' % (NSDECL, BORD13, CELLMAR13, LOOK13)
    for label, fill, bold, labcol in rows:
        x += _row13(label, fill, bold, labcol)
    return x + '</w:tbl>'

body13 = d.root.find(q('body'))
children13 = list(body13)
i_hdr = i_spacer = i_data = None
for i, el in enumerate(children13):
    if el.tag != q('tbl'): continue
    tx = txt(el)
    if tx == '13. OBSERVATIONS DU CSPS14. RÉUNIONS / COORDINATION':
        i_hdr = i
    if 'Observation (sans urgence)' in tx and 'Fréquence visites CSPS' in tx:
        i_data = i
i_spacer = i_hdr + 1
assert i_hdr is not None and i_data == i_spacer + 1 and children13[i_spacer].tag == q('p')

frags13 = [
    _hdr13('13. OBSERVATIONS DU CSPS'), SPACER13,
    _data13([
        ('Observation (sans urgence)', 'E2EFDA', False, '000000'),
        ('Notification (avant reprise)', 'FFF0CC', False, '000000'),
        ('DANGER GRAVE IMMINENT (arrêt immédiat)', 'FFD5D5', True, 'CC0000'),
        ('Délai levée / Suite donnée', 'F2F2F2', True, '000000'),
    ]), SPACER13,
    _hdr13('14. RÉUNIONS / COORDINATION'), SPACER13,
    _data13([
        ('Fréquence visites CSPS', 'F2F2F2', True, '000000'),
        ('Réunions coordination', 'F2F2F2', True, '000000'),
        ("Points d'arrêt / inspections", 'F2F2F2', True, '000000'),
    ]),
]
body13.remove(children13[i_data]); body13.remove(children13[i_spacer]); body13.remove(children13[i_hdr])
for k, frag in enumerate(frags13):
    body13.insert(i_hdr + k, etree.fromstring(frag))

d.save(out+'/Fiche_IC_CSPS17_v17.docx')

d=Doc(src+'/Fiche_IC_Cat3_CSPS17_v5.docx')
frags=[para([run("RISQUES PROPRES À L'ENTREPRISE (travaux confiés) — R.4532-66", b=True, sz=18)], before=160, after=60),
       table([3400,4540,1700], [['Risque propre (origine)', "Mesure annoncée par l'entreprise", 'À reporter au PPSPS'], ['','','']], entete_fill='E8EEF5'),
       para([run(' ', sz=8)], before=120, after=120)]
d.inserer_avant('FORMALITÉS OBLIGATOIRES AVANT DÉMARRAGE', frags)
d.save(out+'/Fiche_IC_Cat3_CSPS17_v6.docx')
print('ok')
