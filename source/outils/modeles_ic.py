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
d.rep('Représentant :', 'Représentant : {{moa_contact}}')
d.rep('Tél :', 'Tél : {{moa_tel}}')
d.rep('n° ____ n° ____', 'n° ____')
d.rep("Les risques propres à l'entreprise figureront dans son PPSPS.", "Les risques propres à l'entreprise sont relevés en 7D et détaillés dans son PPSPS (R.4532-66).")
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
# 11 : conditions hivernales / intemperies
t=tbl_with(d,'Mesure météo'); last=t.findall(q('tr'))[-1]
for lab in ['Arrêt hauteur / levage si vent > limite constructeur','Report travaux extérieurs si verglas / neige','Suivi vigilance Météo-France avant intervention','Équipements froid (gants, vêtements)','Référent intempéries — Nom :']:
    nr=copy.deepcopy(last)
    for i,tc in enumerate(nr.findall(q('tc'))): set_cell(tc, lab if i==4 else '')
    t.append(nr); last=nr
d.save(out+'/Fiche_IC_CSPS17_v17.docx')

d=Doc(src+'/Fiche_IC_Cat3_CSPS17_v5.docx')
frags=[para([run("RISQUES PROPRES À L'ENTREPRISE (travaux confiés) — R.4532-66", b=True, sz=18)], before=160, after=60),
       table([3400,4540,1700], [['Risque propre (origine)', "Mesure annoncée par l'entreprise", 'À reporter au PPSPS'], ['','','']], entete_fill='E8EEF5'),
       para([run(' ', sz=8)], before=120, after=120)]
d.inserer_avant('FORMALITÉS OBLIGATOIRES AVANT DÉMARRAGE', frags)
d.save(out+'/Fiche_IC_Cat3_CSPS17_v6.docx')
print('ok')
