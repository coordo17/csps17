# Registre-journal v3_2 — decisions d'Alain du 30/09 et du 01/10 (points 2 et 3) :
# section "Entreprises intervenantes" (R.4532-38 3°) et identification completee
# (categorie, ref. PGC, date d'ouverture du RJC, date previsionnelle de reception).
# Le bordereau (point 1) et le tableau des intervenants (point 4) sont remplis
# par le code (injecterRJC), pas par ce modele.
import sys
from lxml import etree
from edit_docx import Doc, q, table, run

def txt(e): return ''.join(t.text or '' for t in e.iter(q('t')))
def body_tables(d): return [el for el in d.root.find(q('body')) if el.tag == q('tbl')]
def tbl_with(d, s):
    r = [t for t in body_tables(d) if s in txt(t)]
    assert len(r) == 1, (s, len(r))
    return r[0]

def set_cell(tc, s):
    ps = tc.findall(q('p')); p = ps[0]
    for extra in ps[1:]: tc.remove(extra)
    ts = list(p.iter(q('t')))
    if ts:
        ts[0].text = s
        ts[0].set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        for t in ts[1:]:
            r = t.getparent(); r.getparent().remove(r)
    elif s:
        p.append(etree.fromstring(run(s).replace('<w:r>', '<w:r xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">', 1)))

def set_value_under(tbl, label_substr, tag):
    trs = tbl.findall(q('tr'))
    for i, tr in enumerate(trs):
        tcs = tr.findall(q('tc'))
        for j, tc in enumerate(tcs):
            if label_substr in txt(tc):
                set_cell(trs[i + 1].findall(q('tc'))[j], tag)
                return
    raise AssertionError('libelle introuvable : ' + label_substr)

src, out = sys.argv[1], sys.argv[2]
d = Doc(src + '/CSPS17_Registre_Journal_Bordereau_v3_1.docx')

# 3. Identification : categorie, ref. PGC, dates d'ouverture et de reception previsionnelle
t_id = [t for t in body_tables(d) if 'Cat\u00e9gorie op\u00e9ration' in txt(t)][0]
set_value_under(t_id, 'Cat\u00e9gorie op\u00e9ration', '{{categorie}}')
set_value_under(t_id, 'R\u00e9f. PGC SPS', '{{ref_pgc}}')
set_value_under(t_id, "Date d'ouverture du RJC", '{{date_ouverture_rjc}}')
set_value_under(t_id, 'Date pr\u00e9visionnelle de r\u00e9ception', '{{date_prev_reception}}')

# 2. Nouvelle section "Entreprises intervenantes (R.4532-38 3e)", avant le bordereau
barre_2 = [t for t in body_tables(d) if txt(t).strip() == '2. INTERVENANTS'][0]
barre_3_xml = etree.tostring(barre_2).decode().replace('2. INTERVENANTS', "3. ENTREPRISES INTERVENANTES (Art. R.4532-38 3\u00b0)")
contenu_3 = table(
    [2200, 1200, 2000, 1400, 1000, 700, 1140],
    [['Raison sociale', 'Qualit\u00e9', 'Adresse', 'Lot / travaux confi\u00e9s', "Date approx. d'intervention", 'Effectif pr\u00e9visible', 'Dur\u00e9e pr\u00e9vue']],
)
d.inserer_avant('3. BORDEREAU DES PI\u00c8CES AU REGISTRE JOURNAL', [barre_3_xml, contenu_3])
d.rep('3. BORDEREAU DES PI\u00c8CES AU REGISTRE JOURNAL', '4. BORDEREAU DES PI\u00c8CES AU REGISTRE JOURNAL')

# Bordereau : ne garder que l'entete et le rappel PV-DIUO (*) — les entrees reelles
# sont injectees dynamiquement par injecterRJC(), sans limite de 14 lignes.
t_bord = tbl_with(d, 'Destinataires vis\u00e9s')
trs = t_bord.findall(q('tr'))
for tr in trs[1:-1]:
    t_bord.remove(tr)

d.save(out + '/CSPS17_Registre_Journal_Bordereau_v3_2.docx')
print('ok')
