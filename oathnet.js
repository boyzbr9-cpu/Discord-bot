import { request } from "undici";

const BASE = "https://oathnet.org/api";

async function call(path, params = {}) {
  const key = process.env.OATHNET_API_KEY;
  if (!key) throw new Error("OATHNET_API_KEY missing");

  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, x));
    else url.searchParams.append(k, String(v));
  }

  const { statusCode, body } = await request(url.toString(), {
    method: "GET",
    headers: { "x-api-key": key, accept: "application/json" },
    headersTimeout: 15000,
    bodyTimeout: 20000,
  });
  const text = await body.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (statusCode >= 400) {
    const msg = data?.message || `HTTP ${statusCode}`;
    const err = new Error(`OathNet ${path}: ${msg}`);
    err.status = statusCode;
    throw err;
  }
  return data;
}

export function detectType(q) {
  if (/^\S+@\S+\.\S+$/.test(q)) return "email";
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(q) || /^[a-f0-9:]+:[a-f0-9:]+$/i.test(q)) return "ip";
  if (/^\d{17,20}$/.test(q)) return "discord_id";
  if (/^[a-z0-9-]+\.[a-z]{2,}$/i.test(q)) return "domain";
  if (/^\+?\d[\d\s-]{6,}$/.test(q)) return "phone";
  if (/\s/.test(q)) return "name";
  return "username";
}

export async function searchAll(query, opts = {}) {
  const pageSize = String(opts.pageSize ?? 10);
  const tasks = {
    breach: call("/service/v2/breach/search", { q: query, page_size: pageSize }),
    stealer: call("/service/v2/stealer/search", { q: query, page_size: pageSize }),
    victims: call("/service/v2/victims/search", { q: query, page_size: pageSize }),
  };
  const type = detectType(query);
  if (type === "email") {
    tasks.holehe = call("/service/holehe", { q: query });
    if (/@gmail\.com$/i.test(query)) tasks.ghunt = call("/service/ghunt", { q: query });
  }
  if (type === "ip") tasks.ipInfo = call("/service/ip-info", { q: query });
  if (type === "discord_id") {
    tasks.discord = call("/service/discord-userinfo", { q: query });
    tasks.discordHistory = call("/service/discord-username-history", { q: query });
  }

  const entries = await Promise.allSettled(Object.values(tasks));
  const out = {};
  const errors = [];
  Object.keys(tasks).forEach((k, i) => {
    const r = entries[i];
    if (r.status === "fulfilled") out[k] = r.value?.data ?? r.value;
    else errors.push({ source: k, message: r.reason?.message || "error" });
  });
  return { type, results: out, errors };
}

export async function breachFilter(filters, opts = {}) {
  return call("/service/v2/breach/search", { ...filters, page_size: String(opts.pageSize ?? 10) });
}

export async function ipInfo(ip) { return call("/service/ip-info", { q: ip }); }