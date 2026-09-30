# Extrait de Harmo (public/index.html) les fiches-risques par metier et les
# mots-cles de reconnaissance, a l'identique, pour CSPS17 (7D de la fiche IC).
# Usage : python3 extraire_metiers_harmo.py <harmo index.html> <sortie .js>
import sys
s = open(sys.argv[1], encoding='utf-8').read().replace('\r\n', '\n')
def bloc(debut):
    a = s.index(debut); k = s.index('{', a); d = 0
    for j in range(k, len(s)):
        if s[j] == '{': d += 1
        elif s[j] == '}':
            d -= 1
            if d == 0: return s[k:j + 1]
out = ('// Fiches-risques par metier reprises du PGC Harmo (H_METIERS_RISQUES et H_METIER_MOTS),\n'
       '// texte inchange. Regenerer avec source/outils/extraire_metiers_harmo.py.\n'
       'var IC_METIER_MOTS = ' + bloc('var H_METIER_MOTS = {') + ';\n'
       'var IC_METIERS_RISQUES = ' + bloc('var H_METIERS_RISQUES = {') + ';\n')
open(sys.argv[2], 'w', encoding='utf-8', newline='\n').write(out)
print('ok', len(out))
