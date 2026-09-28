# Assemble index.html a partir de source/ : python source/assembler.py (depuis ~/Documents/csps17)
import base64, os
ici = os.path.dirname(os.path.abspath(__file__))
def lire(n): return open(os.path.join(ici, n), encoding='utf-8').read()
def b64(n): return base64.b64encode(open(os.path.join(ici, n), 'rb').read()).decode()
s = lire('src.html')
morceaux = {
  '/*LIB_PIZZIP*/': lire('lib/pizzip.js'),
  '/*LIB_DOCXTEMPLATER*/': lire('lib/docxtemplater.js'),
  '/*GEN_VISITE*/': lire('gen-visite.js'),
  '/*MODELE_VISITE*/': b64('CR_Visite_Chantier_CSPS17_v3.docx'),
}
for cle, val in morceaux.items():
    assert s.count(cle) == 1, 'repere absent ou double : ' + cle
    if '</script' in val.lower(): raise SystemExit('balise </script> dans ' + cle)
    s = s.replace(cle, val)
sortie = os.path.join(ici, '..', 'index.html')
open(sortie, 'w', encoding='utf-8', newline='\n').write(s)
print('index.html assemble :', len(s), 'caracteres')
