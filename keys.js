import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const FILE = process.env.KEYS_FILE || path.resolve("data/keys.json");

function ensure() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ keys: [] }, null, 2));
}

function read() {
  ensure();
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); }
  catch { return { keys: [] }; }
}

function write(db) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function genCode() {
  // SHLX-XXXX-XXXX-XXXX
  const part = () => crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
  return `SHLX-${part()}-${part()}-${part()}`;
}

export function createKey({ createdBy, durationDays = null, note = "" }) {
  const db = read();
  const code = genCode();
  const now = Date.now();
  const key = {
    code,
    createdBy,
    createdAt: now,
    durationDays: durationDays ?? null,
    note,
    redeemedBy: null,
    redeemedAt: null,
    expiresAt: null,
    revoked: false,
    revokedAt: null,
    revokedBy: null,
  };
  db.keys.push(key);
  write(db);
  return key;
}

export function listKeys() {
  return read().keys;
}

export function findByCode(code) {
  return read().keys.find((k) => k.code.toUpperCase() === String(code || "").toUpperCase()) || null;
}

export function findActiveByUser(userId) {
  const now = Date.now();
  return read().keys.find(
    (k) => k.redeemedBy === userId && !k.revoked && (!k.expiresAt || k.expiresAt > now),
  ) || null;
}

export function revokeKey(code, byUserId) {
  const db = read();
  const k = db.keys.find((x) => x.code.toUpperCase() === code.toUpperCase());
  if (!k) return null;
  k.revoked = true;
  k.revokedAt = Date.now();
  k.revokedBy = byUserId;
  write(db);
  return k;
}

export function redeemKey(code, userId) {
  const db = read();
  const k = db.keys.find((x) => x.code.toUpperCase() === String(code || "").toUpperCase());
  if (!k) return { ok: false, reason: "Clé introuvable." };
  if (k.revoked) return { ok: false, reason: "Cette clé a été révoquée." };
  if (k.redeemedBy && k.redeemedBy !== userId) return { ok: false, reason: "Cette clé a déjà été utilisée par un autre utilisateur." };
  const now = Date.now();
  if (k.expiresAt && k.expiresAt < now) return { ok: false, reason: "Cette clé a expiré." };

  if (!k.redeemedBy) {
    k.redeemedBy = userId;
    k.redeemedAt = now;
    if (k.durationDays && !k.expiresAt) {
      k.expiresAt = now + k.durationDays * 24 * 60 * 60 * 1000;
    }
    write(db);
  }
  return { ok: true, key: k };
}

export function keyStatus(k) {
  if (!k) return "❓ inconnue";
  if (k.revoked) return "⛔ révoquée";
  if (k.expiresAt && k.expiresAt < Date.now()) return "⌛ expirée";
  if (!k.redeemedBy) return "🟡 non utilisée";
  return "🟢 active";
}
