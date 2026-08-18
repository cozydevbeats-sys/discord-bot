import { PermissionFlagsBits } from 'discord.js';
import { sendLog, COLORS } from './helpers.js';

const INVITE_REGEX = /(discord\.(gg|io|me|li)\/|discordapp\.com\/invite\/|discord\.com\/invite\/)/i;

// Anti-spam : mémoire volatile { "guildId-userId": [timestamps] }
const spamMap = new Map();
const SPAM_THRESHOLD = 5;      // messages
const SPAM_INTERVAL = 5000;    // ... en 5 secondes

// Renvoie true si le message a été modéré (supprimé), false sinon
export async function runAutomod(message, cfg) {
  // On ne touche pas aux admins ni au bot
  if (message.author.bot) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

  // --- Filtre de mots ---
  if (cfg.automod_badwords && cfg.badwords) {
    const words = cfg.badwords.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
    const content = message.content.toLowerCase();
    if (words.some((w) => content.includes(w))) {
      await message.delete().catch(() => {});
      await warnUser(message, 'mot interdit');
      await sendLog(message.guild, {
        title: '🛡️ Auto-mod — mot interdit',
        description: `Message de ${message.author} supprimé dans ${message.channel}.`,
        color: COLORS.warn,
      });
      return true;
    }
  }

  // --- Anti-invitations ---
  if (cfg.automod_invites && INVITE_REGEX.test(message.content)) {
    await message.delete().catch(() => {});
    await warnUser(message, 'invitation Discord interdite');
    await sendLog(message.guild, {
      title: '🛡️ Auto-mod — invitation',
      description: `Invitation de ${message.author} supprimée dans ${message.channel}.`,
      color: COLORS.warn,
    });
    return true;
  }

  // --- Anti-spam ---
  if (cfg.automod_spam) {
    const key = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    const timestamps = (spamMap.get(key) || []).filter((t) => now - t < SPAM_INTERVAL);
    timestamps.push(now);
    spamMap.set(key, timestamps);

    if (timestamps.length >= SPAM_THRESHOLD) {
      spamMap.set(key, []);
      // Timeout 60s
      await message.member?.timeout(60_000, 'Spam détecté').catch(() => {});
      await message.channel.send(`⏳ ${message.author}, ralentis (spam détecté) — mute 1 min.`).catch(() => {});
      await sendLog(message.guild, {
        title: '🛡️ Auto-mod — spam',
        description: `${message.author} a été timeout 1 min pour spam.`,
        color: COLORS.error,
      });
      return true;
    }
  }

  return false;
}

async function warnUser(message, reason) {
  await message.channel
    .send(`⚠️ ${message.author}, ton message a été supprimé (${reason}).`)
    .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000))
    .catch(() => {});
}
