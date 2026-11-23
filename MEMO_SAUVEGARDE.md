# Mémo de sauvegarde et de restauration — CSPS17

Dernière vérification : 23/11/2026 (Thot/Claude)

Ce mémo explique comment remettre l'application CSPS17 en état sur un
nouvel ordinateur, ou après une panne. Il y a **deux choses séparées** à
restaurer : le code de l'application (le programme) et les données
(vos affaires, IC/CR, pièces jointes). Le code est sauvegardé en
continu sur GitHub. Les données, elles, sont **stockées uniquement
dans le navigateur de cet ordinateur** — il faut les exporter
vous-même régulièrement.

## 1. Le code de l'application (déjà sauvegardé, rien à faire en temps normal)

- Dossier actuel : `C:\Users\maska\Documents\csps17`
- Dépôt GitHub (sauvegarde du code) : https://github.com/coordo17/csps17
- Branche : `main`
- L'application elle-même (le fichier à ouvrir / servir) se trouve dans
  le sous-dossier `complet/` (`complet/index.html`, `complet/sync-drive.js`,
  `complet/local-api.js`, etc.). Le dossier `source/` contient une copie
  de travail ; `complet/` est la version utilisée.

**Tant que vous travaillez normalement**, chaque modification du code
faite avec moi est enregistrée (`git commit`) puis envoyée sur GitHub
(`git push`) — c'est la sauvegarde. Rien à faire de plus.

### Pour restaurer le code sur un nouvel ordinateur :
1. Installer Git (https://git-scm.com/download/win) si besoin.
2. Ouvrir Git Bash, se placer dans le dossier où vous voulez le projet
   (par exemple `cd ~/Documents`).
3. Lancer :
   ```
   git clone https://github.com/coordo17/csps17.git
   ```
4. Une fenêtre de connexion GitHub peut s'ouvrir dans le navigateur :
   se connecter avec votre compte **coordo17** et autoriser l'accès.
5. Le dossier `csps17` est recréé avec tout l'historique. L'application
   est dans `csps17/complet/index.html`.

## 2. Les données (affaires, IC/CR, pièces jointes) — à sauvegarder vous-même

Les affaires que vous créez dans CSPS17 sont stockées **dans le
navigateur de cet ordinateur** (pas sur GitHub, pas dans un fichier du
dossier projet) :
- la liste des affaires et leur contenu : `localStorage` du navigateur
  (clé `csps17_affaires`)
- les pièces jointes / fichiers du registre : une base `IndexedDB` du
  navigateur (`csps17-fichiers`)

**Si l'ordinateur tombe en panne ou si vous changez de navigateur sans
avoir exporté, ces données sont perdues.** C'est pour cela qu'il faut
exporter une sauvegarde régulièrement.

### Comment exporter une sauvegarde (à faire régulièrement, par ex. chaque semaine)
1. Ouvrir CSPS17 dans le navigateur.
2. Cliquer sur le bouton **"💾 Sauvegardes"** (en haut de l'écran).
3. Cliquer sur **"⬇ Exporter la sauvegarde (.json)"**.
4. Un fichier `CSPS17_SAUVEGARDE_AAAAMMJJ-HHMM.json` est téléchargé
   dans le dossier Téléchargements. Ce fichier contient **toutes les
   affaires et tous les fichiers joints** (tout est inclus dans ce
   seul fichier).
5. Copier ce fichier dans un endroit sûr (clé USB, OneDrive, autre
   disque) — il ne faut pas le laisser uniquement dans Téléchargements.

### Comment restaurer les données sur un nouvel ordinateur (ou après une panne)
1. Installer / ouvrir CSPS17 sur le nouvel ordinateur (voir partie 1
   ci-dessus pour récupérer le code).
2. Ouvrir l'application dans le navigateur.
3. Cliquer sur **"💾 Sauvegardes"**.
4. Cliquer sur **"📥 Importer / restaurer une sauvegarde"** et choisir
   le fichier `CSPS17_SAUVEGARDE_...json` sauvegardé précédemment.
5. Les affaires et fichiers sont réintégrés. L'import **fusionne sans
   écraser** : si une affaire existe déjà en mémoire avec une version
   plus récente, elle est conservée telle quelle.

### Remarque — l'autre bouton "Exporter (fichier)" / "Importer (fichier)"
Il existe aussi, à côté du bouton Sauvegardes, deux boutons
**"⬇ Exporter (fichier)"** et **"⬆ Importer (fichier)"**. Ils servent à
un usage différent : faire passer les IC/CR d'une affaire précise d'un
appareil à un autre (PC ↔ tablette) sans passer par Google Drive — pas
à la sauvegarde complète. Pour une sauvegarde/restauration générale,
utilisez bien le bouton **"💾 Sauvegardes"** décrit ci-dessus.

## En résumé
| Quoi | Où c'est sauvegardé | Action à faire |
|---|---|---|
| Code de l'application | GitHub (`coordo17/csps17`) | Rien, automatique à chaque `push` |
| Affaires / IC / CR / pièces jointes | Uniquement dans ce navigateur | Exporter via "💾 Sauvegardes" régulièrement, garder le fichier .json en lieu sûr |

## Copie de secours sur le disque D:\

En complément de GitHub, une copie complète de ce dossier a été faite sur le disque D:\ le 23/11/2026, dans `D:\Léo\Sauvegardes_2026-11-23\`. Cette copie est une photo à cette date : elle ne se met pas à jour toute seule — il faudra la refaire (ou demander à Claude de la refaire) de temps en temps si vous voulez qu'elle reste à jour.

## Sauvegarde des affaires, classée par affaire, sur le disque D:\

En plus de la sauvegarde globale (§2), un outil `classer_sauvegarde_affaires.py` (dans `csps17\source\outils\`) reprend un export "💾 Sauvegardes" et reconstitue sur `D:\Léo\Sauvegardes_CSPS17_affaires\` un dossier par affaire, avec ses fichiers décodés en clair (PDF, photos...) et sans doublon.

Règles d'exclusion (demande d'Alain du 23/11/2026) :
- **FIC** (Fiche d'inspection commune) : seul le **PDF** est gardé, jamais le .docx généré par l'application — Alain n'envoie jamais de FIC en .docx, pour qu'une entreprise ne puisse pas modifier le texte afin d'éviter un blâme.
- Tout fichier dont le nom contient "essai", "test", "exemple" ou équivalent n'est pas copié.

À l'intérieur de chaque affaire, les fichiers sont maintenant rangés par type de document (CBT, PLANS, PPSPS, FIC, etc. — un sous-dossier par type, fichier `fichiers/<N>_<type>/`), plutôt que tout en vrac.

Les PDF signés qui se trouvaient déjà, en dehors de CSPS17, dans les dossiers "IC signés" du Desktop (AURAY, st-mars-la-briere) et dans le dossier "– Plonéour-Lanvern" (NICOLAS, RENE JONCOUR, BATISOL pour Pont l'Abbé — les 3 retrouvées), ainsi que 3 diagnostics plomb/amiante du lot 6639_05 (Pont l'Abbé, dossier `07_Rapports_diagnostics`), ont été intégrés le 23/11/2026 directement dans la sauvegarde D:\ (ils n'étaient pas encore dans le registre de l'application elle-même). **À faire : les envoyer aussi dans CSPS17** (registre RJC de chaque affaire), pour qu'ils apparaissent dans les prochains exports.

Comme CSPS17 ne contient pas forcément tous les documents qui existent sur le Desktop (certains n'y ont jamais été envoyés), il peut être utile de comparer régulièrement le dossier "– Plonéour-Lanvern" / "Chantier Chausson" avec la sauvegarde sur D:\ pour repérer ce qui manquerait encore.

Utilisation : `python3 csps17\source\outils\classer_sauvegarde_affaires.py <export.json> D:\Léo\Sauvegardes_CSPS17_affaires` — peut être relancé sur plusieurs exports successifs, dans l'ordre chronologique (du plus ancien au plus récent) pour que les fiches `affaire.json` reflètent bien le dernier état.
