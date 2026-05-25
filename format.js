import { EmbedBuilder, AttachmentBuilder } from "discord.js";

const COLORS = { ok: 0x2ecc71, warn: 0xf1c40f, err: 0xe74c3c, info: 0x3498db };

function trunc(s, n = 1000) {
  if (s == null) return "—";
  const str = typeof s === "string" ? s : JSON.stringify(s);
  return str.length > n ? str.slice(0, n - 3) + "..." : str;
}

function countItems(v) {
  if (!v) return 0;
  if (Array.isArray(v)) return v.length;
  if (v.items) return v.items.length;
  if (v.data?.items) return v.data.items.length;
  if (v.data && Array.isArray(v.data)) return v.data.length;
  if (typeof v === "object") return Object.keys(v).length;
  return 0;
}

export function summaryEmbed(title, query, type, sources, errors = []) {
  const fields = Object.entries(sources).map(([k, v]) => ({
    name: k,
    value: `\`${countItems(v)}\` résultats`,
    inline: true,
  }));
  const e = new EmbedBuilder()
    .setTitle(title)
    .setDescription(`**Requête :** \`${query}\`\n**Type détecté :** \`${type ?? "auto"}\``)
    .setColor(COLORS.info)
    .addFields(fields.length ? fields : [{ name: "—", value: "aucune source" }])
    .setTimestamp();
  if (errors.length) {
    e.addFields({
      name: "⚠️ Erreurs",
      value: errors.map((x) => `• ${x.source}: ${trunc(x.message, 80)}`).join("\n").slice(0, 1024),
    });
  }
  return e;
}

export function jsonAttachment(name, obj) {
  const buf = Buffer.from(JSON.stringify(obj, null, 2), "utf8");
  return new AttachmentBuilder(buf, { name: `${name}.json` });
}

export function errorEmbed(msg) {
  return new EmbedBuilder().setTitle("Erreur").setDescription(trunc(msg, 1800)).setColor(COLORS.err);
}
