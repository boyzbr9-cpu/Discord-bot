import "dotenv/config";
import { REST, Routes } from "discord.js";
import { startCommand } from "./commands/start.js";
import { keyCommand } from "./commands/key.js";
import { redeemCommand } from "./commands/redeem.js";
import { configCommand } from "./commands/config.js";
import { commands as searchCommands } from "./commands/search.js";

const commands = [startCommand, keyCommand, redeemCommand, configCommand, ...searchCommands].map((c) => c.data.toJSON());
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const clientId = process.env.CLIENT_ID;
    if (!clientId || clientId.startsWith("http")) {
      throw new Error("CLIENT_ID invalide : mets juste l'ID numérique (pas l'URL OAuth).");
    }
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(clientId, process.env.GUILD_ID), { body: commands });
      console.log(`✅ ${commands.length} commandes déployées (guild).`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log(`✅ ${commands.length} commandes déployées (global).`);
    }
  } catch (e) {
    console.error("❌ Deploy échoué :", e);
    process.exit(1);
  }
})();
