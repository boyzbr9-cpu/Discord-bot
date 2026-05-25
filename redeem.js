import { SlashCommandBuilder } from "discord.js";
import { redeemKey } from "../lib/store.js";

export const redeemCommand = {
  data: new SlashCommandBuilder()
    .setName("redeem")
    .setDescription("Activer une clé d'accès")
    .addStringOption((o) => o.setName("key").setDescription("Ta clé").setRequired(true)),
  async execute(interaction) {
    const value = interaction.options.getString("key", true).trim();
    const res = redeemKey(value, interaction.user.id);
    if (!res.ok) return interaction.reply({ content: `❌ ${res.error}`, ephemeral: true });
    return interaction.reply({
      content: "✅ Clé activée. Tu peux maintenant utiliser `/start` pour lancer une recherche.",
      ephemeral: true,
    });
  },
};
