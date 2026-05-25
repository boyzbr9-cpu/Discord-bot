import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error("DISCORD_TOKEN et CLIENT_ID sont requis.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);
const body = commands.map((c) => c.data.toJSON());

try {
  if (guildId) {
    console.log(`Déploiement sur la guilde ${guildId}...`);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    console.log(`✅ ${body.length} commandes déployées sur la guilde.`);
  } else {
    console.log("Déploiement global (peut prendre jusqu'à 1h)...");
    await rest.put(Routes.applicationCommands(clientId), { body });
    console.log(`✅ ${body.length} commandes déployées globalement.`);
  }
} catch (e) {
  console.error("Erreur déploiement:", e);
  process.exit(1);
}
