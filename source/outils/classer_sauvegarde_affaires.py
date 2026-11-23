#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
classer_sauvegarde_affaires.py
-------------------------------
Reprend un fichier "CSPS17_SAUVEGARDE_....json" produit par le bouton
"Sauvegardes -> Exporter la sauvegarde (.json)" de CSPS17, et reconstitue
sur le disque un dossier par affaire, avec ses fichiers (pieces jointes)
decodes en clair (PDF, photos, etc.), en supprimant les doublons de
fichiers identiques a l'interieur d'une meme affaire.

Regles d'exclusion (demande d'Alain du 23/11/2026) :
  - FIC (Fiche d'inspection commune) : SEUL le PDF est garde. Les
    brouillons .docx generes par l'application ne sont jamais copies
    (Alain n'envoie jamais de .docx pour les FIC, afin qu'une
    entreprise ne puisse pas modifier le texte pour eviter un blame).
  - Tout fichier dont le nom contient "essai", "test", "exemple",
    "lorem", "dummy", "bidon" ou "fictif" (sans rapport avec un vrai
    chantier) n'est pas copie.

Usage :
    python3 classer_sauvegarde_affaires.py <export.json> <dossier_destination>

Ne modifie jamais le fichier .json source. Peut etre relance plusieurs
fois sur des exports successifs : les fichiers deja presents (meme
contenu, detecte par hachage) ne sont pas recopies.
"""
import sys
import os
import re
import json
import base64
import hashlib

DATA_URL_RE = re.compile(r'^data:([^;,]*)(;base64)?,(.*)$', re.DOTALL)
MOTS_EXCLUS = re.compile(r'essai|test|exemple|lorem|dummy|bidon|fictif', re.I)

LIBELLES_DOCREF = {
    'CBT': '01_CBT', 'CISSCT-CONV': '02_CISSCT_Convocation', 'CISSCT-CR': '02_CISSCT_CR',
    'CISSCT-RI': '02_CISSCT_Reglement_Interieur', 'CONTRAINTES': '03_Contraintes_site',
    'CONTRAT': '04_Contrat_coordination', 'CRMOA': '05_CR_reunion_MOA', 'DGI': '06_Signalement_DGI',
    'DIAG': '07_Rapports_diagnostics', 'DIF': '08_Fiche_Diffusion_PGC', 'DIUO': '09_DIUO',
    'DP': '10_Declaration_Prealable', 'FIC': '11_FIC', 'HARMOP': '12_Harmonisation_PPSPS',
    'IC': '13_Courrier_Transmission_IC', 'ICR': '14_Inspection_commune_realisee',
    'OBS': '15_Observation_Notification_RJC', 'PGC': '16_PGC', 'PGCR': '16_PGC_Redaction',
    'PLAN': '17_Plannings', 'PLANS': '18_Plans', 'PPP': '19_Grille_Analyse_PPSPS',
    'PPSPS': '20_PPSPS_entreprises', 'PV-DIUO': '21_PV_Transmission_DIUO',
    'PV-PC': '22_PV_Passation_Consignes', 'RCO': '23_CR_Reunion_Coordination',
    'RFM': '24_Rapport_Fin_Mission', 'RJC': '25_Registre_Journal_Coordination',
    'VIS': '26_CR_Visite_Chantier',
}

def sous_dossier_pour(doc_ref):
    return LIBELLES_DOCREF.get(doc_ref, 'Autres' if not doc_ref else ('99_' + doc_ref))



def sanitize_nom(nom):
    nom = nom.strip() or 'Sans nom'
    nom = re.sub(r'[\\/:*?"<>|]', '_', nom)
    nom = re.sub(r'\s+', ' ', nom)
    return nom[:120].strip(' .') or 'Sans nom'


def decoder_data_url(d):
    m = DATA_URL_RE.match(d or '')
    if not m:
        return b''
    corps = m.group(3)
    if m.group(2):
        return base64.b64decode(corps)
    from urllib.parse import unquote
    return unquote(corps).encode('utf-8', errors='replace')


def nom_fichier_depuis_cle(cle):
    base = cle.split('/')[-1]
    m = re.match(r'^\d+-(.+)$', base)
    return m.group(1) if m else base


def charger_index_hash(dossier_affaire):
    p = os.path.join(dossier_affaire, '_hashes.json')
    if os.path.exists(p):
        try:
            with open(p, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def sauver_index_hash(dossier_affaire, index):
    p = os.path.join(dossier_affaire, '_hashes.json')
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


def nom_disponible(dossier, nom):
    if not os.path.exists(os.path.join(dossier, nom)):
        return nom
    base, ext = os.path.splitext(nom)
    i = 2
    while os.path.exists(os.path.join(dossier, base + '_' + str(i) + ext)):
        i += 1
    return base + '_' + str(i) + ext


def fichiers_a_exclure(rjc):
    """Retourne l'ensemble des fichierPath a NE PAS copier :
    FIC qui ne sont pas en PDF, et tout fichier dont le nom evoque un
    essai/test."""
    exclus = set()
    for e in rjc:
        chemin = e.get('fichierPath')
        if not chemin:
            continue
        nom = e.get('fichierNom') or ''
        if e.get('docRef') == 'FIC' and not nom.lower().endswith('.pdf'):
            exclus.add(chemin)
        elif MOTS_EXCLUS.search(nom):
            exclus.add(chemin)
    return exclus


def main():
    if len(sys.argv) != 3:
        print("Usage : python3 classer_sauvegarde_affaires.py <export.json> <dossier_destination>")
        sys.exit(1)

    src, dest_racine = sys.argv[1], sys.argv[2]

    with open(src, 'r', encoding='utf-8') as f:
        brut = json.load(f)

    if isinstance(brut, list):
        affaires, fichiers = brut, {}
    elif isinstance(brut, dict) and brut.get('format') == 'csps17':
        affaires, fichiers = brut.get('affaires', []), brut.get('fichiers', {})
    else:
        print("Format de fichier non reconnu (attendu : export CSPS17).")
        sys.exit(1)

    os.makedirs(dest_racine, exist_ok=True)

    total_fichiers_ecrits = 0
    total_doublons = 0
    total_exclus = 0
    cles_utilisees = set()

    print("%d affaire(s) dans l'export." % len(affaires))

    for affaire in affaires:
        aff_id = affaire.get('id', '')
        num = (affaire.get('num') or '').strip()
        nom_chantier = ((affaire.get('chantier') or {}).get('nom') or '').strip()
        nom_dossier = sanitize_nom((num + ' - ' + nom_chantier) if num or nom_chantier else aff_id or 'affaire')
        dossier_affaire = os.path.join(dest_racine, nom_dossier)
        dossier_fichiers = os.path.join(dossier_affaire, 'fichiers')
        os.makedirs(dossier_fichiers, exist_ok=True)

        with open(os.path.join(dossier_affaire, 'affaire.json'), 'w', encoding='utf-8') as f:
            json.dump(affaire, f, ensure_ascii=False, indent=2)

        rjc = affaire.get('rjc', [])
        exclus_affaire = fichiers_a_exclure(rjc)
        ref_par_chemin = {e.get('fichierPath'): e.get('docRef') for e in rjc if e.get('fichierPath')}

        index_hash = charger_index_hash(dossier_affaire)
        prefixe = 'local/' + aff_id + '/'
        nb_fichiers_affaire = 0
        nb_doublons_affaire = 0
        nb_exclus_affaire = 0

        for cle, donnee in fichiers.items():
            if not cle.startswith(prefixe):
                continue
            cles_utilisees.add(cle)
            if cle in exclus_affaire:
                nb_exclus_affaire += 1
                continue
            contenu = decoder_data_url(donnee)
            h = hashlib.sha256(contenu).hexdigest()
            if h in index_hash:
                nb_doublons_affaire += 1
                continue
            sous_dossier = sous_dossier_pour(ref_par_chemin.get(cle))
            dossier_cible = os.path.join(dossier_fichiers, sous_dossier)
            os.makedirs(dossier_cible, exist_ok=True)
            nom_fichier = nom_disponible(dossier_cible, nom_fichier_depuis_cle(cle))
            with open(os.path.join(dossier_cible, nom_fichier), 'wb') as f:
                f.write(contenu)
            index_hash[h] = os.path.join(sous_dossier, nom_fichier)
            nb_fichiers_affaire += 1

        sauver_index_hash(dossier_affaire, index_hash)
        total_fichiers_ecrits += nb_fichiers_affaire
        total_doublons += nb_doublons_affaire
        total_exclus += nb_exclus_affaire
        print("  - %-45s : %2d fichier(s) nouveau(x), %2d doublon(s), %2d exclu(s) (FIC non-PDF / essai)"
              % (nom_dossier, nb_fichiers_affaire, nb_doublons_affaire, nb_exclus_affaire))

    orphelins = [c for c in fichiers if c not in cles_utilisees]
    if orphelins:
        dossier_orph = os.path.join(dest_racine, '_fichiers_sans_affaire')
        os.makedirs(dossier_orph, exist_ok=True)
        index_hash = charger_index_hash(dossier_orph)
        nb = 0
        for cle in orphelins:
            contenu = decoder_data_url(fichiers[cle])
            h = hashlib.sha256(contenu).hexdigest()
            if h in index_hash:
                continue
            nom_fichier = nom_disponible(dossier_orph, nom_fichier_depuis_cle(cle))
            with open(os.path.join(dossier_orph, nom_fichier), 'wb') as f:
                f.write(contenu)
            index_hash[h] = nom_fichier
            nb += 1
        sauver_index_hash(dossier_orph, index_hash)
        if nb:
            print("%d fichier(s) sans affaire associee mis de cote dans _fichiers_sans_affaire/" % nb)

    print("\nTotal : %d fichier(s) ecrit(s), %d doublon(s) ignore(s), %d exclu(s) (FIC non-PDF / essai)."
          % (total_fichiers_ecrits, total_doublons, total_exclus))


if __name__ == '__main__':
    main()
