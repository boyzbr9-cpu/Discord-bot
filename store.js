// Petit store JSON (keys + config serveur). Pas besoin de DB.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const KEYS_FILE = process.env.KEYS_FILE || "./data/keys.json";
const CONFIG_FILE = process.env.CONFIG_FILE || "./data/config.json";

function ensure(file, fallback) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
}

ensure(KEYS_FILE, { keys: [] });
ensure(CONFIG_FILE, {});

function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function writeJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

// ---------- KEYS ----------
export function listKeys() { return readJson(KEYS_FILE).keys; }

export function createKey({ note = "", uses = 1, durationDays = 30, createdBy }) {
  const db = readJson(KEYS_FILE);
  const value = "SHX-" + crypto.randomBytes(8).toString("hex").toUpperCase();
  const key = {
    value,
    note,
    uses,
    remaining: uses,
    expiresAt: durationDays > 0 ? Date.now() + durationDays * 86400000 : 0,
    createdBy,
    createdAt: Date.now(),
    redeemedBy: [], // [{ userId, at }]
  };
  db.keys.push(key);
  writeJson(KEYS_FILE, db);
  return key;
}

export function revokeKey(value) {
  const db = readJson(KEYS_FILE);
  const before = db.keys.length;
  db.keys = db.keys.filter((k) => k.value !== value);
  writeJson(KEYS_FILE, db);
  return db.keys.length < before;
}

export function getKeyByUser(userId) {
  const db = readJson(KEYS_FILE);
  return db.keys.find((k) => k.redeemedBy.some((r) => r.userId === userId));
}

export function redeemKey(value, userId) {
  const db = readJson(KEYS_FILE);
  const k = db.keys.find((x) => x.value === value);
  if (!k) return { ok: false, error: "Clé introuvable." };
  if (k.expiresAt && k.expiresAt < Date.now()) return { ok: false, error: "Clé expirée." };
  if (k.remaining <= 0) return { ok: false, error: "Clé déjà utilisée." };
  if (k.redeemedBy.some((r) => r.userId === userId)) return { ok: true, key: k };
  k.remaining -= 1;
  k.redeemedBy.push({ userId, at: Date.now() });
  writeJson(KEYS_FILE, db);
  return { ok: true, key: k };
}

export function userHasActiveKey(userId) {
  // Bot owner global a toujours accès
  if (process.env.BOT_OWNER_ID && userId === process.env.BOT_OWNER_ID.trim()) return true;
  const k = getKeyByUser(userId);
  if (!k) return false;
  if (k.expiresAt && k.expiresAt < Date.now()) return false;
  return true;
}

// ---------- CONFIG ----------
export function getConfig(guildId) {
  const db = readJson(CONFIG_FILE);
  return db[guildId] || {};
}

export function setConfig(guildId, patch) {
  const db = readJson(CONFIG_FILE);
  db[guildId] = { ...(db[guildId] || {}), ...patch };
  writeJson(CONFIG_FILE, db);
  return db[guildId];
}
