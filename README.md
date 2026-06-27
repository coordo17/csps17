# CSPS17 — Gestionnaire de Coordination SPS

Application web de gestion des 17 documents de coordination SPS.  
Auteur : Alain SUZANNE — CSPS17

## Déploiement sur Render.com (gratuit)

### Étape 1 — GitHub
1. Crée un compte GitHub si pas encore fait : https://github.com
2. Crée un nouveau dépôt (bouton + en haut à droite) → nom : `csps17`
3. Mets tous ces fichiers dedans (glisser-déposer dans l'interface GitHub)

### Étape 2 — Render
1. Crée un compte Render : https://render.com (connexion avec GitHub)
2. Clic "New +" → "Web Service"
3. Connecte ton dépôt GitHub `csps17`
4. Paramètres :
   - **Name** : csps17
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Plan** : Free
5. Dans "Environment Variables" → ajoute :
   - `ANTHROPIC_API_KEY` = ta clé API (sk-ant-...)
6. Clic "Create Web Service"

### Résultat
Ton app sera disponible sur : `https://csps17.onrender.com`
→ Accessible depuis le téléphone avec la 4G, partout sur chantier.

## Installation sur smartphone (PWA)

### Android (Chrome)
1. Ouvre l'URL dans Chrome
2. Menu ⋮ → "Ajouter à l'écran d'accueil"

### iPhone (Safari)
1. Ouvre l'URL dans Safari
2. Bouton partage → "Sur l'écran d'accueil"

## Lancement local (PC)

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start
```
Puis ouvre : http://localhost:3017
