import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { SERVICES } from "../lib/services.js";
import { userHasActiveKey } from "../lib/store.js";

export const startCommand = {
  data: new SlashCommandBuilder()
    .setName("start")
    .setDescription("Lancer une recherche Sherlox"),
  async execute(interaction) {
    if (!userHasActiveKey(interaction.user.id)) {
      return interaction.reply({
        content:
          "🔒 Tu n'as pas de **clé active**. Utilise `/redeem key:<TA_CLÉ>` pour activer ton accès.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🔎 Recherche avancée")
      .setDescription("Choisis le **type de recherche** ci-dessous.")
      .setColor(0x5865f2);

    const menu = new StringSelectMenuBuilder()
      .setCustomId("sherlox:service")
      .setPlaceholder("Sélectionne un type de recherche")
      .addOptions(
        SERVICES.map((s) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(s.label)
            .setDescription(s.description)
            .setEmoji(s.emoji)
            .setValue(s.id),
        ),
      );

    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  },
};
