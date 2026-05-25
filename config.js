import { SlashCommandBuilder, EmbedBuilder, ChannelType } from "discord.js";
import { getConfig, setConfig } from "../lib/store.js";
import { isOwner } from "../lib/permissions.js";

export const configCommand = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configurer le bot (owner uniquement)")
    .addSubcommand((s) =>
      s
        .setName("setowner")
        .setDescription("Définir le rôle owner autorisé à gérer le bot")
        .addRoleOption((o) => o.setName("role").setDescription("Rôle owner").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("setstaff")
        .setDescription("Définir le rôle staff (gestion clés)")
        .addRoleOption((o) => o.setName("role").setDescription("Rôle staff").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("setsearch")
        .setDescription("Salon où /start est autorisé")
        .addChannelOption((o) =>
          o.setName("channel").setDescription("Salon de recherche").addChannelTypes(ChannelType.GuildText).setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("setlogs")
        .setDescription("Salon de logs des recherches")
        .addChannelOption((o) =>
          o.setName("channel").setDescription("Salon logs").addChannelTypes(ChannelType.GuildText).setRequired(true),
        ),
    )
    .addSubcommand((s) => s.setName("show").setDescription("Voir la config actuelle"))
    .addSubcommand((s) => s.setName("reset").setDescription("Réinitialiser la config")),
  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({ content: "⛔ Réservé aux owners.", ephemeral: true });
    }
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === "setowner") {
      const r = interaction.options.getRole("role", true);
      setConfig(gid, { ownerRoleId: r.id });
      return interaction.reply({ content: `✅ Rôle owner = <@&${r.id}>`, ephemeral: true });
    }
    if (sub === "setstaff") {
      const r = interaction.options.getRole("role", true);
      setConfig(gid, { staffRoleId: r.id });
      return interaction.reply({ content: `✅ Rôle staff = <@&${r.id}>`, ephemeral: true });
    }
    if (sub === "setsearch") {
      const c = interaction.options.getChannel("channel", true);
      setConfig(gid, { searchChannelId: c.id });
      return interaction.reply({ content: `✅ Salon recherche = <#${c.id}>`, ephemeral: true });
    }
    if (sub === "setlogs") {
      const c = interaction.options.getChannel("channel", true);
      setConfig(gid, { logsChannelId: c.id });
      return interaction.reply({ content: `✅ Salon logs = <#${c.id}>`, ephemeral: true });
    }
    if (sub === "show") {
      const cfg = getConfig(gid);
      const embed = new EmbedBuilder()
        .setTitle("⚙️ Config Sherlox")
        .setColor(0x5865f2)
        .addFields(
          { name: "Rôle owner", value: cfg.ownerRoleId ? `<@&${cfg.ownerRoleId}>` : "—", inline: true },
          { name: "Rôle staff", value: cfg.staffRoleId ? `<@&${cfg.staffRoleId}>` : "—", inline: true },
          { name: "Salon recherche", value: cfg.searchChannelId ? `<#${cfg.searchChannelId}>` : "—", inline: true },
          { name: "Salon logs", value: cfg.logsChannelId ? `<#${cfg.logsChannelId}>` : "—", inline: true },
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === "reset") {
      setConfig(gid, { ownerRoleId: null, staffRoleId: null, searchChannelId: null, logsChannelId: null });
      return interaction.reply({ content: "🧹 Config réinitialisée.", ephemeral: true });
    }
  },
};
