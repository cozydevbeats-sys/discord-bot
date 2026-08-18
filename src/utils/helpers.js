import { EmbedBuilder } from 'discord.js';
import db, { getGuildConfig } from '../database/db.js';

// Enregistre une sanction dans l'historique de modération
export function addModlog(guildId, userId, moderatorId, action, reason) {
  db.prepare('INSERT INTO modlog (guild_id, user_id, moderator_id, action, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
    .run(guildId, userId, moderatorId, action, reason || 'Aucune raison fournie', Date.now());
}

export const COLOR = parseInt(process.env.EMBED_COLOR || '5865F2', 16);
export const COLORS = {
  base: COLOR,
  success: 0x57f287,
  error: 0xed4245,
  warn: 0xfee75c,
  info: 0x5865f2,
};

export function embed({ title, description, color = COLORS.base, fields, footer, thumbnail } = {}) {
  const e = new EmbedBuilder().setColor(color);
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  if (fields) e.addFields(fields);
  if (footer) e.setFooter({ text: footer });
  if (thumbnail) e.setThumbnail(thumbnail);
  e.setTimestamp();
  return e;
}

// XP nécessaire pour atteindre le niveau suivant (courbe façon MEE6)
export function xpForLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

// Envoie un embed dans le salon de logs configuré, si présent
export async function sendLog(guild, options) {
  try {
    const cfg = getGuildConfig(guild.id);
    if (!cfg.log_channel) return;
    const channel = guild.channels.cache.get(cfg.log_channel);
    if (!channel) return;
    await channel.send({ embeds: [embed(options)] });
  } catch (err) {
    console.error('[log] impossible d\'envoyer le log :', err.message);
  }
}

// Convertit "10m", "2h", "1d", "30s" en millisecondes. Renvoie null si invalide.
export function parseDuration(input) {
  if (!input) return null;
  const match = String(input).trim().toLowerCase().match(/^(\d+)\s*(s|m|h|d|j)$/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const factors = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, j: 86_400_000 };
  return value * factors[unit];
}

// Remplace les variables dans les messages de bienvenue/départ/level-up
export function formatMessage(template, { member, guild, level } = {}) {
  if (!template) return null;
  return template
    .replaceAll('{user}', member ? `<@${member.id}>` : '')
    .replaceAll('{username}', member?.user?.username ?? '')
    .replaceAll('{server}', guild?.name ?? '')
    .replaceAll('{membercount}', guild?.memberCount?.toString() ?? '')
    .replaceAll('{level}', level?.toString() ?? '');
}
