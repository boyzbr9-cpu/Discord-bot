import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { createKey, listKeys, revokeKey } from "../lib/store.js";
import { isStaff } from "../lib/permissions.js";

export const keyCommand = {
  data: new SlashCommandBuilder()
    .setName("key")
    .setDescription("Gestion des clés (staff/owner uniquement)")
    .addSubcommand((s) =>
      s
        .setName("create")
        .setDescription("Créer une clé")
        .addIntegerOption((o) => o.setName("duration").setDescription("Durée en jours (0 = illimité)").setMinValue(0))
        .addIntegerOption((o) => o.setName("uses").setDescription("Nombre d'utilisations").setMinValue(1))
        .addStringOption((o) => o.setName("note").setDescription("Note interne")),
    )
    .addSubcommand((s) =>
      s.setName("list").setDescription("Lister toutes les clés"),
    )
    .addSubcommand((s) =>
      s
        .setName("revoke")
        .setDescription("Révoquer une clé")
        .addStringOption((o) => o.setName("value").setDescription("Valeur de la clé").setRequired(true)),
    ),
  async execute(interaction) {
    if (!isStaff(interaction)) {
      return interaction.reply({ content: "⛔ Réservé au staff/owner.", ephemeral: true });
    }
    const sub = interaction.options.getSubcommand();

    if (sub === "create") {
      const durationDays = interaction.options.getInteger("duration") ?? 30;
      const uses = interaction.options.getInteger("uses") ?? 1;
      const note = interaction.options.getString("note") ?? "";
      const k = createKey({ note, uses, durationDays, createdBy: interaction.user.id });
      const embed = new EmbedBuilder()
        .setTitle("🔑 Nouvelle clé créée")
        .setColor(0x57f287)
        .addFields(
          { name: "Clé", value: "`" + k.value + "`" },
          { name: "Utilisations", value: String(k.uses), inline: true },
          { name: "Durée", value: durationDays === 0 ? "Illimitée" : `${durationDays} jours`, inline: true },
          { name: "Note", value: note || "—" },
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "list") {
      const keys = listKeys();
      if (!keys.length) return interaction.reply({ content: "Aucune clé.", ephemeral: true });
      const lines = keys.slice(0, 25).map((k) => {
        const exp = k.expiresAt ? `<t:${Math.floor(k.expiresAt / 1000)}:R>` : "∞";
        return `• \`${k.value}\` — ${k.remaining}/${k.uses} — exp ${exp}`;
      });
      return interaction.reply({ content: lines.join("\n"), ephemeral: true });
    }

    if (sub === "revoke") {
      const value = interaction.options.getString("value", true);
      const ok = revokeKey(value);
      return interaction.reply({ content: ok ? "✅ Clé révoquée." : "❌ Clé introuvable.", ephemeral: true });
    }
  },
};
