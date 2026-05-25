import { request } from "undici";

const BASE = "https://breachhub.org";

async function call(path, params = {}) {
  const key = process.env.BREACHHUB_API_KEY;
  if (!key) throw new Error("BREACHHUB_API_KEY missing");
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.append(k, String(v));
  }
  url.searchParams.append("key", key);

  const { statusCode, body } = await request(url.toString(), {
    method: "GET",
    headers: { accept: "application/json" },
    headersTimeout: 15000,
    bodyTimeout: 20000,
  });
  const text = await body.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (statusCode >= 400) {
    const err = new Error(`BreachHub ${path}: HTTP ${statusCode}`);
    err.status = statusCode;
    err.data = data;
    throw err;
  }
  return data;
}

// Recherches "tout-en-un"
export async function searchQuery(query) {
  const tasks = {
    leakosint: call("/api/leakosint", { query }),
    leakcheck: call("/api/leakcheck/v2", { query }),
    snusbase: call("/api/snusbase", { query }),
    breachhub: call("/api/breachhub/search", { query }),
  };
  const r = await Promise.allSettled(Object.values(tasks));
  const out = {}; const errors = [];
  Object.keys(tasks).forEach((k, i) => {
    if (r[i].status === "fulfilled") out[k] = r[i].value;
    else errors.push({ source: k, message: r[i].reason?.message });
  });
  return { results: out, errors };
}

export const bh = {
  email: (q) => searchQuery(q),
  username: (q) => call("/api/osintbat/username-breach", { query: q }),
  userFootprint: (q) => call("/api/osintbat/user-footprint", { query: q }),
  emailOsint: (q) => call("/api/osintbat/email-osint", { query: q }),
  phone: (q) => call("/api/osintbat/phone-breach", { query: q }),
  ip: (q) => call("/api/osintbat/ip", { query: q }),
  ipWhois: (ip) => call("/api/snusbase/ip-whois", { ip }),
  discord: (id) => call("/api/osintbat/discord", { query: id }),
  stalkme: (id) => call("/api/breachhub/stalkme/lookup", { id }),
  intelx: (system_id) => call("/api/intelx", { system_id }),
  breachesByName: ({ first_name, last_name, useWildcard = true }) =>
    call("/api/intelvault/breaches", { first_name, last_name, useWildcard }),
  generic: searchQuery,
};