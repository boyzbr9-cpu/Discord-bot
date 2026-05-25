# Discord OSINT Bot (OathNet + BreachHub)

Bot Discord en slash commands qui interroge **OathNet** et **BreachHub** et renvoie les résultats en embeds.

## ⚠️ Sécurité
- Ne commit JAMAIS ton `.env`.
- Si un token a fuité (ex: collé en clair), **régénère-le** depuis le Discord Developer Portal.
- Les clés API restent côté serveur uniquement.

## Commandes

### `/identite`
- `nom` — recherche par nom
- `prenom` — recherche par prénom
- `date_naissance` — date au format `YYYY-MM-DD`

### `/localisation`
- `ville`, `code_postal`, `adresse`

### `/id` (un seul champ requis)
- `telephone`, `email`, `nir`, `plaque`, `vin`, `iban`

### `/comptes`
- `discord_id`, `pseudo`, `intelx_id`, `email`

### `/reseau`
- `ip` — lookup IP (géo, ASN, ISP)

## Installation locale

```bash
cp .env.example .env
# remplir les valeurs
npm install
npm run deploy   # enregistre les slash commands
npm start
```

## Déploiement Railway

1. Crée un nouveau projet Railway → **Deploy from GitHub repo** (ou upload).
2. Dans **Variables**, ajoute :
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID` (optionnel)
   - `OATHNET_API_KEY`
   - `BREACHHUB_API_KEY`
3. Railway lance `npm install` puis `npm start` automatiquement.
4. Lance une fois `npm run deploy` (Railway → Shell, ou en local avec les mêmes vars) pour publier les slash commands.

## Inviter le bot
URL OAuth2 (remplace `CLIENT_ID`) :
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=2147485696
```
