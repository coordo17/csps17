# -*- coding: utf-8 -*-
"""
Ajoute la version du document (tiree du nom de fichier) dans une case sous le
logo, en en-tete de chaque .docx d'un dossier (ex: complet/modeles/).

Usage :
    python3 ajouter_version_logo.py complet/modeles

- Lit tous les *.docx du dossier donne.
- Version = ce qui suit le dernier "_v" dans le nom de fichier, juste avant
  ".docx", underscores convertis en points (ex: "..._v3_2.docx" -> "v3.2",
  "..._v17.docx" -> "v17").
- Fichiers sans "_vNN" dans le nom : ignores (affiches dans le resume).
- Modifie header1.xml (et tout autre headerN.xml contenant le logo) : ajoute
  une ligne sous la cellule du logo, meme largeur de colonne, avec la
  version en petit texte gris centre.
- Idempotent : si la case de version existe deja (marqueur special), elle
  est juste remplacee par la nouvelle valeur plutot que dupliquee.
- Ecrit en place (remplace chaque .docx), apres avoir copie l'original en
  .docx.bak a cote (jamais ecrase si un .bak existe deja, pour ne pas
  perdre un original si le script est relance par erreur sur un dossier
  deja traite puis restaure).
"""
import sys, os, re, zipfile, shutil
from lxml import etree

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS = {'w': W}
MARKER = 'CSPS17-VERSION'  # pose dans un w:bookmarkStart pour reperer notre propre ligne

def qn(tag):
    return '{%s}%s' % (W, tag)

def version_depuis_nom(nom):
    m = re.search(r'_v([0-9]+(?:_[0-9]+)*)\.docx$', nom, re.IGNORECASE)
    if not m:
        return None
    return 'v' + m.group(1).replace('_', '.')

def construire_ligne_version(largeur_dxa, version):
    return (
        '<w:tr xmlns:w="%s">'
        '<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/>'
        '<w:tcBorders><w:top w:val="none" w:sz="0" w:space="0" w:color="FFFFFF"/>'
        '<w:left w:val="none" w:sz="0" w:space="0" w:color="FFFFFF"/>'
        '<w:bottom w:val="none" w:sz="0" w:space="0" w:color="FFFFFF"/>'
        '<w:right w:val="none" w:sz="0" w:space="0" w:color="FFFFFF"/></w:tcBorders>'
        '<w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/>'
        '<w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="60" w:type="dxa"/>'
        '<w:bottom w:w="20" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar>'
        '<w:vAlign w:val="center"/></w:tcPr>'
        '<w:p><w:pPr><w:jc w:val="center"/><w:bookmarkStart w:id="9001" w:name="%s"/>'
        '<w:bookmarkEnd w:id="9001"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/>'
        '<w:color w:val="999999"/><w:sz w:val="13"/><w:szCs w:val="13"/></w:rPr>'
        '<w:t xml:space="preserve">%s</w:t></w:r></w:p></w:tc></w:tr>'
    ) % (W, largeur_dxa, MARKER, version)

def traiter_header_xml(xml_bytes, version):
    root = etree.fromstring(xml_bytes)
    modifie = False
    for tbl in root.iter(qn('tbl')):
        trs = tbl.findall(qn('tr'))
        if not trs:
            continue
        premiere_ligne = trs[0]
        premiere_cellule = premiere_ligne.find(qn('tc'))
        if premiere_cellule is None:
            continue
        a_logo = premiere_cellule.find('.//' + qn('drawing')) is not None
        if not a_logo:
            continue
        # Largeur de la 1ere colonne (gridCol ou tcW de la cellule du logo)
        tcW = premiere_cellule.find(qn('tcPr') + '/' + qn('tcW'))
        largeur = int(tcW.get(qn('w'))) if tcW is not None else 2000

        # Deja une ligne-version posee par ce script ? (bookmark MARKER)
        existante = None
        for tr in trs[1:]:
            if tr.find('.//' + qn('bookmarkStart') + "[@{%s}name='%s']" % (W, MARKER)) is not None:
                existante = tr
                break
        nouvelle_tr = etree.fromstring(construire_ligne_version(largeur, version).encode('utf-8'))
        if existante is not None:
            tbl.replace(existante, nouvelle_tr)
        else:
            premiere_ligne.addnext(nouvelle_tr)
        modifie = True
    if not modifie:
        return None
    return etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)

def traiter_docx(chemin):
    nom = os.path.basename(chemin)
    version = version_depuis_nom(nom)
    if not version:
        return ('ignore', nom, None)

    bak = chemin + '.bak'
    if not os.path.exists(bak):
        shutil.copy(chemin, bak)

    zin = zipfile.ZipFile(chemin, 'r')
    contenus = {it.filename: zin.read(it.filename) for it in zin.infolist()}
    infos = zin.infolist()
    zin.close()

    headers_modifies = []
    for nom_fichier in list(contenus.keys()):
        if re.match(r'word/header\d+\.xml$', nom_fichier):
            resultat = traiter_header_xml(contenus[nom_fichier], version)
            if resultat is not None:
                contenus[nom_fichier] = resultat
                headers_modifies.append(nom_fichier)

    if not headers_modifies:
        return ('sans_logo', nom, version)

    zout = zipfile.ZipFile(chemin, 'w', zipfile.ZIP_DEFLATED)
    for it in infos:
        zout.writestr(it, contenus[it.filename])
    zout.close()
    return ('ok', nom, version)

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 ajouter_version_logo.py <dossier>")
        sys.exit(1)
    dossier = sys.argv[1]
    fichiers = sorted(f for f in os.listdir(dossier) if f.lower().endswith('.docx'))
    print("%d fichier(s) .docx trouve(s) dans %s" % (len(fichiers), dossier))
    for nom in fichiers:
        chemin = os.path.join(dossier, nom)
        statut, nom2, version = traiter_docx(chemin)
        if statut == 'ok':
            print("  OK        %-55s -> %s" % (nom2, version))
        elif statut == 'sans_logo':
            print("  SANS LOGO %-55s (version %s detectee, aucun en-tete avec logo trouve)" % (nom2, version))
        else:
            print("  IGNORE    %-55s (pas de _vNN dans le nom)" % nom2)

if __name__ == '__main__':
    main()
