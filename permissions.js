import { PermissionFlagsBits } from "discord.js";
import { getConfig } from "./store.js";

// Owner global défini dans .env (BOT_OWNER_ID) — accès total partout
export function isBotOwner(interaction) {
  const id = process.env.BOT_OWNER_ID?.trim();
  return !!id && interaction.user.id === id;
}

// "Owner" = bot owner global (ENV) OU propriétaire du serveur OU rôle owner configuré
export function isOwner(interaction) {
  if (isBotOwner(interaction)) return true;
  if (!interaction.guild) return false;
  if (interaction.user.id === interaction.guild.ownerId) return true;

  const cfg = getConfig(interaction.guild.id);
  const ownerRole = cfg.ownerRoleId;
  if (ownerRole && interaction.member?.roles?.cache?.has(ownerRole)) return true;

  return interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) ?? false;
}

export function isStaff(interaction) {
  if (isOwner(interaction)) return true;
  const cfg = getConfig(interaction.guild?.id);
  const staffRole = cfg.staffRoleId;
  return staffRole ? interaction.member?.roles?.cache?.has(staffRole) : false;
}
