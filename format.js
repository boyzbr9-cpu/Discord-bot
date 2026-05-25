import { EmbedBuilder, AttachmentBuilder } from "discord.js";

export function summaryEmbed(title, query, type, sources = {}, errors = []) {
  const embed = new EmbedBuilder()
    .setTitle(`🔎 ${title}`)
    .setColor(0x5865f2)
    .setTimestamp();
  if (query) embed.setDescription(`Requête : \`${query}\`\nType détecté : \`${type || "auto"}\``);

  let totalHits = 0;
  const fields = [];
  for (const [src, val] of Object.entries(sources)) {
    if (val == null) continue;
    let count = 0;
    if (Array.isArray(val)) count = val.length;
    else if (Array.isArray(val?.data)) count = val.data.length;
    else if (Array.isArray(val?.results)) count = val.results.length;
    else if (typeof val === "object") count = Object.keys(val).length;
    totalHits += count;
    fields.push({ name: src, value: count ? `**${count}** résultat(s)` : "—", inline: true });
  }
  if (fields.length) embed.addFields(fields);
  embed.setFooter({ text: `Total: ${totalHits} • ${errors.length} erreur(s)` });
  if (errors.length) {
    embed.addFields({
      name: "Erreurs",
      value: errors.slice(0, 5).map((e) => `• \`${e.source}\` ${e.message || ""}`).join("\n").slice(0, 1024) || "—",
    });
  }
  return embed;
}

export function jsonAttachment(name, payload) {
  const buf = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  return new AttachmentBuilder(buf, { name: `${name}-${Date.now()}.json` });
}

export function errorEmbed(message) {
  return new EmbedBuilder().setTitle("❌ Erreur").setDescription("```" + (message || "Inconnue") + "```").setColor(0xed4245);
}
