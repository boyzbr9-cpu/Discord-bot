import { SlashCommandBuilder } from "discord.js";
import * as oath from "../lib/oathnet.js";
import { bh } from "../lib/breachhub.js";
import { summaryEmbed, jsonAttachment, errorEmbed } from "../lib/format.js";

// Helper: collecte les sources (oathnet+breachhub) pour une "query" texte
async function runQuery(interaction, query, opts = {}) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const [o, b] = await Promise.allSettled([
      oath.searchAll(query, { pageSize: 10 }),
      bh.generic(query),
    ]);
    const oathRes = o.status === "fulfilled" ? o.value : { type: "auto", results: {}, errors: [{ source: "oathnet", message: o.reason?.message }] };
    const bhRes = b.status === "fulfilled" ? b.value : { results: {}, errors: [{ source: "breachhub", message: b.reason?.message }] };

    const combinedSources = {
      ...Object.fromEntries(Object.entries(oathRes.results).map(([k, v]) => [`oath.${k}`, v])),
      ...Object.fromEntries(Object.entries(bhRes.results).map(([k, v]) => [`bh.${k}`, v])),
    };
    const errors = [...(oathRes.errors || []), ...(bhRes.errors || [])];

    const embed = summaryEmbed(opts.title || "Résultats OSINT", query, oathRes.type, combinedSources, errors);
    const file = jsonAttachment("results", { query, type: oathRes.type, oathnet: oathRes.results, breachhub: bhRes.results, errors });
    await interaction.editReply({ embeds: [embed], files: [file] });
  } catch (e) {
    await interaction.editReply({ embeds: [errorEmbed(e.message)] });
  }
}

// /identite
const identite = {
  data: new SlashCommandBuilder()
    .setName("identite")
    .setDescription("Recherche par identité (nom, prénom, date de naissance)")
    .addStringOption((o) => o.setName("nom").setDescription("Nom de famille"))
    .addStringOption((o) => o.setName("prenom").setDescription("Prénom"))
    .addStringOption((o) => o.setName("date_naissance").setDescription("YYYY-MM-DD")),
  async execute(interaction) {
    const nom = interaction.options.getString("nom");
    const prenom = interaction.options.getString("prenom");
    const dn = interaction.options.getString("date_naissance");
    if (!nom && !prenom && !dn) return interaction.reply({ content: "Donne au moins un champ.", ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    try {
      const tasks = [];
      tasks.push(oath.breachFilter({ last_name: nom, first_name: prenom, date_birth_from: dn, date_birth_to: dn }, { pageSize: 15 }));
      if (nom || prenom) tasks.push(bh.breachesByName({ first_name: prenom, last_name: nom, useWildcard: true }));
      const [obreach, bhr] = await Promise.allSettled(tasks);
      const sources = {};
      const errors = [];
      if (obreach.status === "fulfilled") sources["oath.breach"] = obreach.value?.data; else errors.push({ source: "oath.breach", message: obreach.reason?.message });
      if (bhr) {
        if (bhr.status === "fulfilled") sources["bh.intelvault"] = bhr.value; else errors.push({ source: "bh.intelvault", message: bhr.reason?.message });
      }
      const query = [prenom, nom, dn].filter(Boolean).join(" ");
      await interaction.editReply({ embeds: [summaryEmbed("Identité", query, "name", sources, errors)], files: [jsonAttachment("identite", { query, sources, errors })] });
    } catch (e) {
      await interaction.editReply({ embeds: [errorEmbed(e.message)] });
    }
  },
};

// /localisation
const localisation = {
  data: new SlashCommandBuilder()
    .setName("localisation")
    .setDescription("Recherche par localisation")
    .addStringOption((o) => o.setName("ville").setDescription("Ville"))
    .addStringOption((o) => o.setName("code_postal").setDescription("Code postal"))
    .addStringOption((o) => o.setName("adresse").setDescription("Adresse")),
  async execute(interaction) {
    const ville = interaction.options.getString("ville");
    const cp = interaction.options.getString("code_postal");
    const adresse = interaction.options.getString("adresse");
    if (!ville && !cp && !adresse) return interaction.reply({ content: "Donne au moins un champ.", ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    try {
      const r = await oath.breachFilter({ city: ville, postal_code: cp }, { pageSize: 15 });
      const query = [adresse, ville, cp].filter(Boolean).join(", ");
      const sources = { "oath.breach": r?.data };
      await interaction.editReply({ embeds: [summaryEmbed("Localisation", query, "location", sources)], files: [jsonAttachment("localisation", { query, sources })] });
    } catch (e) { await interaction.editReply({ embeds: [errorEmbed(e.message)] }); }
  },
};

// /id (identifiants directs)
const id = {
  data: new SlashCommandBuilder()
    .setName("id")
    .setDescription("Recherche par identifiant direct (un seul champ suffit)")
    .addStringOption((o) => o.setName("telephone").setDescription("Téléphone (E.164 conseillé)"))
    .addStringOption((o) => o.setName("email").setDescription("Email"))
    .addStringOption((o) => o.setName("nir").setDescription("NIR / SSN"))
    .addStringOption((o) => o.setName("plaque").setDescription("Plaque d'immatriculation"))
    .addStringOption((o) => o.setName("vin").setDescription("VIN véhicule"))
    .addStringOption((o) => o.setName("iban").setDescription("IBAN")),
  async execute(interaction) {
    const opts = interaction.options;
    const tel = opts.getString("telephone");
    const email = opts.getString("email");
    const nir = opts.getString("nir");
    const plaque = opts.getString("plaque");
    const vin = opts.getString("vin");
    const iban = opts.getString("iban");
    const value = email || tel || nir || iban || plaque || vin;
    if (!value) return interaction.reply({ content: "Donne au moins un identifiant.", ephemeral: true });

    if (email) return runQuery(interaction, email, { title: "Lookup email" });
    if (tel) {
      await interaction.deferReply({ ephemeral: true });
      try {
        const [ob, bp] = await Promise.allSettled([
          oath.breachFilter({ phone: tel }, { pageSize: 15 }),
          bh.phone(tel),
        ]);
        const sources = {};
        const errors = [];
        if (ob.status === "fulfilled") sources["oath.breach"] = ob.value?.data; else errors.push({ source: "oath.breach", message: ob.reason?.message });
        if (bp.status === "fulfilled") sources["bh.phone"] = bp.value; else errors.push({ source: "bh.phone", message: bp.reason?.message });
        await interaction.editReply({ embeds: [summaryEmbed("Téléphone", tel, "phone", sources, errors)], files: [jsonAttachment("phone", { query: tel, sources, errors })] });
      } catch (e) { await interaction.editReply({ embeds: [errorEmbed(e.message)] }); }
      return;
    }
    if (nir) {
      await interaction.deferReply({ ephemeral: true });
      try {
        const r = await oath.breachFilter({ ssn: nir }, { pageSize: 15 });
        await interaction.editReply({ embeds: [summaryEmbed("NIR", nir, "nir", { "oath.breach": r?.data })], files: [jsonAttachment("nir", r)] });
      } catch (e) { await interaction.editReply({ embeds: [errorEmbed(e.message)] }); }
      return;
    }
    if (iban) {
      await interaction.deferReply({ ephemeral: true });
      try {
        const r = await oath.breachFilter({ iban }, { pageSize: 15 });
        await interaction.editReply({ embeds: [summaryEmbed("IBAN", iban, "iban", { "oath.breach": r?.data })], files: [jsonAttachment("iban", r)] });
      } catch (e) { await interaction.editReply({ embeds: [errorEmbed(e.message)] }); }
      return;
    }
    // plaque / vin : pas d'endpoint dédié → on tente une recherche texte générique
    return runQuery(interaction, value, { title: plaque ? "Plaque" : "VIN" });
  },
};

// /comptes
const comptes = {
  data: new SlashCommandBuilder()
    .setName("comptes")
    .setDescription("Recherche par pseudo / compte (Discord, IntelX, email lookup)")
    .addStringOption((o) => o.setName("discord_id").setDescription("Discord ID (numérique)"))
    .addStringOption((o) => o.setName("pseudo").setDescription("Pseudo / username"))
    .addStringOption((o) => o.setName("intelx_id").setDescription("IntelX System ID"))
    .addStringOption((o) => o.setName("email").setDescription("Email lookup")),
  async execute(interaction) {
    const did = interaction.options.getString("discord_id");
    const pseudo = interaction.options.getString("pseudo");
    const intelx = interaction.options.getString("intelx_id");
    const email = interaction.options.getString("email");
    if (!did && !pseudo && !intelx && !email) return interaction.reply({ content: "Donne au moins un champ.", ephemeral: true });

    if (intelx) {
      await interaction.deferReply({ ephemeral: true });
      try {
        const r = await bh.intelx(intelx);
        await interaction.editReply({ embeds: [summaryEmbed("IntelX", intelx, "intelx", { "bh.intelx": r })], files: [jsonAttachment("intelx", r)] });
      } catch (e) { await interaction.editReply({ embeds: [errorEmbed(e.message)] }); }
      return;
    }
    if (did) {
      await interaction.deferReply({ ephemeral: true });
      try {
        const [u, h, dr, bd, sm] = await Promise.allSettled([
          oath.searchAll(did),
          // already in searchAll
          Promise.resolve(null),
          Promise.resolve(null),
          bh.discord(did),
          bh.stalkme(did),
        ]);
        const sources = {};
        const errors = [];
        if (u.status === "fulfilled") {
          for (const [k, v] of Object.entries(u.value.results)) sources[`oath.${k}`] = v;
          for (const e of u.value.errors) errors.push(e);
        } else errors.push({ source: "oathnet", message: u.reason?.message });
        if (bd.status === "fulfilled") sources["bh.discord"] = bd.value; else errors.push({ source: "bh.discord", message: bd.reason?.message });
        if (sm.status === "fulfilled") sources["bh.stalkme"] = sm.value; else errors.push({ source: "bh.stalkme", message: sm.reason?.message });
        await interaction.editReply({ embeds: [summaryEmbed("Discord", did, "discord_id", sources, errors)], files: [jsonAttachment("discord", { query: did, sources, errors })] });
      } catch (e) { await interaction.editReply({ embeds: [errorEmbed(e.message)] }); }
      return;
    }
    if (email) return runQuery(interaction, email, { title: "Email lookup" });
    // pseudo
    return runQuery(interaction, pseudo, { title: `Pseudo: ${pseudo}` });
  },
};

// /reseau
const reseau = {
  data: new SlashCommandBuilder()
    .setName("reseau")
    .setDescription("Lookup IP (géolocalisation, ASN, ISP)")
    .addStringOption((o) => o.setName("ip").setDescription("Adresse IP").setRequired(true)),
  async execute(interaction) {
    const ip = interaction.options.getString("ip");
    await interaction.deferReply({ ephemeral: true });
    try {
      const [oi, bi, bw] = await Promise.allSettled([
        oath.ipInfo(ip),
        bh.ip(ip),
        bh.ipWhois(ip),
      ]);
      const sources = {};
      const errors = [];
      if (oi.status === "fulfilled") sources["oath.ipInfo"] = oi.value; else errors.push({ source: "oath.ipInfo", message: oi.reason?.message });
      if (bi.status === "fulfilled") sources["bh.ip"] = bi.value; else errors.push({ source: "bh.ip", message: bi.reason?.message });
      if (bw.status === "fulfilled") sources["bh.whois"] = bw.value; else errors.push({ source: "bh.whois", message: bw.reason?.message });
      await interaction.editReply({ embeds: [summaryEmbed("Réseau / IP", ip, "ip", sources, errors)], files: [jsonAttachment("ip", { query: ip, sources, errors })] });
    } catch (e) { await interaction.editReply({ embeds: [errorEmbed(e.message)] }); }
  },
};

export const commands = [identite, localisation, id, comptes, reseau];
