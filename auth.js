import { PermissionFlagsBits } from "discord.js";

export function isStaff(interaction) {
  const staffRoleId = process.env.STAFF_ROLE_ID;
  const member = interaction.member;
  if (!member) return false;
  if (member.permissions?.has?.(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions?.has?.(PermissionFlagsBits.ManageGuild)) return true;
  if (staffRoleId && member.roles?.cache?.has?.(staffRoleId)) return true;
  // raw roles array fallback
  if (staffRoleId && Array.isArray(member.roles) && member.roles.includes(staffRoleId)) return true;
  return false;
}
