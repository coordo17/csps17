# Mémo de reprise — CSPS17 « complet » — état au 30/09/2026

## 1. Objectif et décisions

- CSPS17 est l'outil personnel d'Alain et doit être **complet** : tout le potentiel de l'ancien CSPS17 (affaires, 19 documents, Terrain, registre, tableau de bord), sans serveur. Harmo reste Harmo (logiciel distinct).
- **Une seule appli** pour le PC et la tablette Android : https://coordo17.github.io/csps17/complet/
- **Aucune IA**, sauf plus tard la description des photos (IA gratuite : Gemini, ChatGPT ou autre, éventuellement au retour sur le PC). Tout le reste en déterministe.
- Plus de Render, Firebase, Supabase. Le service Render « csps17 » est **suspendu** (pas supprimé : il garde la clé Firebase au cas où).
- **Méthode de revue des documents Word**, un par un : lire le modèle et le remplissage → vérifier contre la loi (Légifrance ; Alain l'a en favoris s'il faut un texte), les pratiques DEKRA/SOCOTEC (aucun modèle public trouvé jusqu'ici, ne rien leur attribuer), les préconisations OPPBTP et CARSAT (notamment la **CARSAT Centre-Ouest**, caisse d'Alain) → liste courte de propositions sourcées → Alain valide → modèle + code → test → livraison.
- Règles d'Alain : lui tenir tête en cas de doute, vérifier la loi et montrer la source avant de coder, un point à la fois, ne jamais inventer de chiffre ou de règle, ne pas reporter à une « prochaine séance ».
- Le **PGC d'Harmo** sera intégré dans CSPS17 quand on arrivera au PGC (transposer le générateur déterministe d'Harmo ; lecture des PDF à faire dans le navigateur ; import planning sans IA ou saisie des lots). Il faudra alors le code d'Harmo (`public/index.html`, `server.js`, `server_parsers.js`).

## 2. Ce qui existe

**Dépôt `coordo17/csps17`** (public, GitHub Pages, branche `main`), dossier local `~/Documents/csps17` (Git Bash, compte harmoppsps-wq collaborateur).

- Racine : ancienne appli « CR de terrain » (index.html, sw.js, manifest, icônes) — reste en place tant que `complet/` n'est pas validé comme appli principale.
- `complet/index.html` : l'appli complète **assemblée** (ne pas modifier à la main).
- `complet/local-api.js` : remplace le serveur (les anciens appels `/api/*` sont traités dans l'appareil ; pièces jointes du registre en IndexedDB « csps17-fichiers »).
- `complet/sync-drive.js` : bouton **⇄ Synchroniser** par Google Drive.
- `complet/gen-visite.js` : générateur du CR de visite (+ outils partagés pour le CR de réunion).
- `complet/lib/` : pizzip.js, docxtemplater.js. `complet/modeles/` : tous les modèles Word.
- `source/complet/construire.py` : **construit `complet/index.html`** à partir de l'ancien index.html de CSPS17 (`~/Documents/csps17_ancien_2026-09-28/index.html`) en appliquant tous les correctifs (sections 1 à 9o). Il lit aussi `onglet-documents.js` et `gen-reunion.part.js` (même dossier).
  Commande : `python3 source/complet/construire.py ~/Documents/csps17_ancien_2026-09-28/index.html complet/index.html`
- `source/` : sources de l'ancienne appli CR de terrain (src.html, gen-visite.js, assembler.py, lib/).

**Synchronisation PC ⇄ tablette** : compte Google dédié **cspsdonnees@gmail.com** (validé avec le numéro de la SIM de la tablette). Console Google : projet CSPS17, API Drive activée, écran de consentement « Externe » en mode test (utilisateur test cspsdonnees@gmail.com), client Web « CSPS17 appli », origine `https://coordo17.github.io`, ID client `282523067881-3ia7tora957rq0d3eb256o88m39jiekg.apps.googleusercontent.com` (le code secret n'est pas utilisé : à désactiver dans la console s'il ne l'est pas encore). Dossier Drive `CSPS17`, fichier `CSPS17_donnees.json` ; les pièces jointes sont retirées du Drive dès que les deux appareils les ont ; les entrées du registre des deux appareils sont toujours réunies. Testé et validé PC ⇄ tablette.

**Boutons ajoutés** : ⟳ Mettre à jour (remplace Ctrl+Maj+R, surtout pour la tablette ; l'heure de version est affichée en haut), ⇄ Synchroniser, Sauvegardes (export/import JSON avec les fichiers du registre). Envoi de documents : enregistrement dans Téléchargements puis Gmail (pas de serveur de mail).

**Affaire réelle** : Pont-l'Abbé (CSPS-2026-0002) importée de l'ancienne sauvegarde du 24/07 ; seule affaire à reprendre (les autres chantiers ne sont pas encore signés).

## 3. Fait et validé (30/09)

- Onglet Documents rangé en blocs **Conception / Réalisation / CISSCT / DIUO** (CISSCT puis DIUO en fin de page), documents hors catégorie masqués ; analyses déjà faites (diagnostics, PGC pré-rempli) conservées ; cartes IA retirées (sauf consultation).
- Registre (RJC) : menu **« Classé dans »** sur chaque entrée pour rattacher une entrée à son document.
- Onglet Chantier : champ **« Réf. du PGC »** (utilisé par tous les documents).
- **Fiche IC** Cat. 1-2 v16 et Cat. 3 v5 : vocabulaire R.4532-14, antipoison automatique (8 centres), canicule décret 2025-482 (jaune/orange/rouge), harnais R.4323-61, échelles règle du PGC (R.4323-63), PPSPS simplifié Cat. 3, émargement + 9 PGP (L.4121-2) + diffusion, mesures de risques vérifiées (R.4541-9, R.4431-2, R.4412-133…), bug « Intempéries » corrigé.
- **CR de visite** v4 : phase, prochaine intervention, lot, effectif ; visa des intéressés (R.4532-38 2°) ; suivi des observations précédentes ; délais 24 h / 48 h (CARSAT Centre-Ouest) ; reprise après validation MOA ; section photos retirée s'il n'y a pas de photo.
- **Signalement DGI** v5 : titre selon le pouvoir d'arrêt contractuel (fiche affaire), plus de règle « 24 h / DREETS », droit d'alerte et de retrait (L.4131-1), document entièrement rempli, nouveaux champs Terrain.
- **Observation / notification** (courrier v2, sert aussi au courrier IC) : titre selon la nature, cases référence et délai, visa et réponse, mention d'information du MOA pour notification/relance.
- **CR de réunion de coordination** v3 : entièrement rempli, participants avec excusés, coactivité, suivi partagé avec le CR de visite, nouvelles observations « description ; responsable ; délai », visa, prochaine réunion.

## 4. Reste à faire, dans l'ordre

1. Réalisation : **registre-journal (bordereau)**, **grille d'analyse des PPSPS** (v4), **rapport de fin de mission**.
2. Conception : suivi de la déclaration préalable, fiche de diffusion du PGC, PV de passation des consignes.
3. **CISSCT** : règlement intérieur, convocation, CR de réunion.
4. **DIUO** : trame, PV de transmission.
5. **PGC** : intégrer le PGC d'Harmo (voir §1).
6. Fonctions ex-IA en déterministe (dépôt de pièces, analyses, harmonisation PPSPS) ; description des photos par IA gratuite.
7. Point 1 du plan initial : revue de la fiche affaire (Chantier / Intervenants / Organismes, organismes automatiques selon l'adresse comme dans Harmo).
8. Quand tout est validé : faire de `complet/` l'appli principale (racine), puis supprimer Render, Firebase et Supabase.

Modèles laissés de côté (non utilisés) : Fiche_IC_Cat3 v1, Grille PPSPS v3, Courrier de transmission IC, Observation/Notification RJC, Mise en demeure DGI (base légale à vérifier avant toute reprise).

## 5. Installation d'une livraison (routine)

Les fichiers téléchargés arrivent dans `~/Documents/csps17` (les télécharger **un par un**, pas « tout télécharger » qui crée un zip). Vérifier avec `ls -la`, les ranger avec `mv`, contrôler `git status --short`, puis `git add -A && git commit -m "…" && git push`. Sur chaque appareil : ⟳ Mettre à jour. Le Python de Windows veut des chemins `C:/Users/...`, pas `/c/Users/...`.

## 6. Pour démarrer la nouvelle conversation

Joindre :
- ce mémo ;
- `~/Documents/csps17/source/complet/construire.py`, `onglet-documents.js`, `gen-reunion.part.js` ;
- `~/Documents/csps17/complet/local-api.js`, `sync-drive.js`, `gen-visite.js` ;
- `~/Documents/csps17_ancien_2026-09-28/index.html` (base de construction) ;
- `edit_docx.py` (outil d'édition des modèles Word, rangé dans `source/outils/`) ;
- les modèles de l'étape à traiter, pris dans `~/Documents/csps17/complet/modeles/` : `CSPS17_Registre_Journal_Bordereau_v3_1.docx`, `CSPS17_Grille_Analyse_PPSPS_v4.docx`, `CSPS17_Rapport_Fin_Mission_v2.docx`.
