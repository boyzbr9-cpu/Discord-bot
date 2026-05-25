# Sherlox Bot

Bot Discord OSINT avec menu /start (Email / Téléphone / Prénom+Nom / Username), commandes détaillées (`/identite`, `/localisation`, `/id`, `/comptes`, `/reseau`), système de clés et config serveur.

## Setup

```bash
npm install
cp .env.example .env
# remplis .env (DISCORD_TOKEN, CLIENT_ID, BOT_OWNER_ID, OATHNET_API_KEY, BREACHHUB_API_KEY)
npm run deploy   # enregistre les slash commands
npm start
```

## Permissions

- **`BOT_OWNER_ID`** dans `.env` → toi, accès TOTAL partout (toutes commandes, pas besoin de clé).
- **Owner serveur** ou rôle configuré via `/config setowner` → gère le bot sur ce serveur.
- **Staff** (rôle `/config setstaff`) → peut créer/lister/révoquer les clés.
- **Utilisateurs avec clé** (`/redeem`) → peuvent lancer des recherches.
- **Sans clé** → aucune recherche possible.

## Commandes

### Owner
- `/config setowner @role` — rôle owner du serveur
- `/config setstaff @role` — rôle staff (gestion clés)
- `/config setsearch #salon` — limite `/start` à ce salon
- `/config setlogs #salon` — logs des recherches
- `/config show` / `/config reset`

### Staff
- `/key create [duration] [uses] [note]`
- `/key list`
- `/key revoke <value>`

### Utilisateurs
- `/redeem key:<TA_CLÉ>` — activer une clé
- `/start` — menu déroulant de recherche
- `/identite`, `/localisation`, `/id`, `/comptes`, `/reseau` — recherches directes
