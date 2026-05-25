import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} from "discord.js";
import { getService } from "../lib/services.js";
import { userHasActiveKey, getConfig } from "../lib/store.js";
import * as oath from "../lib/oathnet.js";
import { bh } from "../lib/breachhub.js";
import { summaryEmbed, jsonAttachment, errorEmbed } from "../lib/format.js";

const SEARCH_COMMANDS = new Set(["identite", "localisation", "id", "comptes", "reseau"]);

export async function handleInteraction(interaction, client) {
  try {
    // ---- Slash commands ----
    if (interaction.isChatInputCommand()) {
      // Gate clé pour /start et toutes les commandes de recherche
      if (interaction.commandName === "start" || SEARCH_COMMANDS.has(interaction.commandName)) {
        if (!userHasActiveKey(interaction.user.id)) {
          return interaction.reply({
            content: "🔒 Tu n'as pas de **clé active**. Utilise `/redeem key:<TA_CLÉ>`.",
            ephemeral: true,
          });
        }
        // Restriction de salon
        const cfg = getConfig(interaction.guild?.id);
        if (cfg.searchChannelId && cfg.searchChannelId !== interaction.channelId) {
          return interaction.reply({
            content: `⛔ Utilise <#${cfg.searchChannelId}> pour les recherches.`,
            ephemeral: true,
          });
        }
      }
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;
      return cmd.execute(interaction);
    }

    // ---- Select menu : choix du service ----
    if (interaction.isStringSelectMenu() && interaction.customId === "sherlox:service") {
      if (!userHasActiveKey(interaction.user.id)) {
        return interaction.reply({ content: "🔒 Clé requise.", ephemeral: true });
      }
      const svc = getService(interaction.values[0]);
      if (!svc) return interaction.reply({ content: "Service inconnu.", ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId(`sherlox:query:${svc.id}`)
        .setTitle(`Recherche — ${svc.label}`);

      const input = new TextInputBuilder()
        .setCustomId("query")
        .setLabel(svc.field)
        .setPlaceholder(svc.placeholder)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(200);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    // ---- Modal submit : requête OSINT ----
    if (interaction.isModalSubmit() && interaction.customId.startsWith("sherlox:query:")) {
      if (!userHasActiveKey(interaction.user.id)) {
        return interaction.reply({ content: "🔒 Clé requise.", ephemeral: true });
      }
      const svcId = interaction.customId.split(":")[2];
      const svc = getService(svcId);
      const query = interaction.fields.getTextInputValue("query").trim();

      await interaction.deferReply({ ephemeral: true });

      // Logs facultatifs
      const cfg = getConfig(interaction.guild?.id);
      if (cfg.logsChannelId) {
        const ch = await interaction.guild.channels.fetch(cfg.logsChannelId).catch(() => null);
        if (ch?.isTextBased()) {
          ch.send({
            embeds: [
              new EmbedBuilder()
                .setTitle("📓 Log recherche")
                .setColor(0x99aab5)
                .addFields(
                  { name: "Utilisateur", value: `<@${interaction.user.id}>`, inline: true },
                  { name: "Type", value: svc.label, inline: true },
                  { name: "Requête", value: "`" + query + "`" },
                )
                .setTimestamp(),
            ],
          }).catch(() => {});
        }
      }

      // 🔎 Logique OSINT réelle (oathnet + breachhub)
      try {
        const [o, b] = await Promise.allSettled([
          oath.searchAll(query, { pageSize: 10 }),
          bh.generic(query),
        ]);
        const oathRes = o.status === "fulfilled" ? o.value : { type: svc.id, results: {}, errors: [{ source: "oathnet", message: o.reason?.message }] };
        const bhRes = b.status === "fulfilled" ? b.value : { results: {}, errors: [{ source: "breachhub", message: b.reason?.message }] };

        const sources = {
          ...Object.fromEntries(Object.entries(oathRes.results || {}).map(([k, v]) => [`oath.${k}`, v])),
          ...(bhRes && typeof bhRes === "object" && !Array.isArray(bhRes) ? { "bh.generic": bhRes } : {}),
        };
        const errors = [...(oathRes.errors || []), ...(bhRes.errors || [])];

        const embed = summaryEmbed(svc.label, query, oathRes.type || svc.id, sources, errors);
        const file = jsonAttachment("results", { service: svc.id, query, oathnet: oathRes.results, breachhub: bhRes, errors });
        return interaction.editReply({ embeds: [embed], files: [file] });
      } catch (e) {
        return interaction.editReply({ embeds: [errorEmbed(e.message)] });
      }
    }
  } catch (e) {
    console.error("interaction error:", e);
    if (interaction.isRepliable() && !interaction.replied) {
      interaction.reply({ content: "❌ Erreur interne.", ephemeral: true }).catch(() => {});
    }
  }
}
