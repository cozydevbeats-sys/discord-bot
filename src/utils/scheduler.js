import db, { getGuildConfig } from '../database/db.js';
import { embed, COLORS } from './helpers.js';
import { endGiveaway } from './giveaways.js';
import { computeStat } from './stats.js';

let lastStats = 0;
let lastBirthday = 0;
const STATS_INTERVAL = 10 * 60 * 1000;   // 10 min (limite de renommage Discord)
const BIRTHDAY_INTERVAL = 5 * 60 * 1000;  // 5 min

// Boucle légère toutes les 15 secondes
export function startScheduler(client) {
  setInterval(() => tick(client).catch((e) => console.error('[scheduler]', e)), 15_000);
  console.log('[scheduler] démarré (intervalle 15s).');
}

async function tick(client) {
  const now = Date.now();

  // --- Giveaways arrivés à terme ---
  const dueGiveaways = db.prepare('SELECT message_id FROM giveaways WHERE ended = 0 AND end_at <= ?').all(now);
  for (const g of dueGiveaways) await endGiveaway(client, g.message_id);

  // --- Rappels ---
  const dueReminders = db.prepare('SELECT * FROM reminders WHERE remind_at <= ?').all(now);
  for (const r of dueReminders) {
    db.prepare('DELETE FROM reminders WHERE id = ?').run(r.id);
    try {
      const channel = await client.channels.fetch(r.channel_id);
      await channel.send({ content: `<@${r.user_id}>`, embeds: [embed({ title: '⏰ Rappel', description: r.content, color: COLORS.info })] });
    } catch {
      try {
        const user = await client.users.fetch(r.user_id);
        await user.send({ embeds: [embed({ title: '⏰ Rappel', description: r.content, color: COLORS.info })] });
      } catch { /* abandon */ }
    }
  }

  // --- Compteurs de stats (throttle 10 min) ---
  if (now - lastStats >= STATS_INTERVAL) {
    lastStats = now;
    const channels = db.prepare('SELECT * FROM stats_channels').all();
    for (const sc of channels) {
      try {
        const guild = client.guilds.cache.get(sc.guild_id);
        if (!guild) continue;
        const channel = guild.channels.cache.get(sc.channel_id);
        if (!channel) { db.prepare('DELETE FROM stats_channels WHERE channel_id = ?').run(sc.channel_id); continue; }
        const value = computeStat(guild, sc.type);
        const newName = sc.template.replace('{count}', value).slice(0, 100);
        if (channel.name !== newName) await channel.setName(newName);
      } catch { /* rate-limit ou perms, on réessaiera */ }
    }
  }

  // --- Anniversaires (throttle 5 min) ---
  if (now - lastBirthday >= BIRTHDAY_INTERVAL) {
    lastBirthday = now;
    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth() + 1;
    const stamp = today.getFullYear() * 10000 + m * 100 + d; // clé du jour

    const bdays = db.prepare('SELECT * FROM birthdays WHERE day = ? AND month = ?').all(d, m);
    for (const b of bdays) {
      if (b.last_announced === stamp) continue;
      const cfg = getGuildConfig(b.guild_id);
      if (!cfg.birthday_channel) continue;
      const guild = client.guilds.cache.get(b.guild_id);
      const channel = guild?.channels.cache.get(cfg.birthday_channel);
      if (!channel) continue;
      await channel.send({ embeds: [embed({ title: '🎂 Joyeux anniversaire !', description: `Souhaitez un joyeux anniversaire à <@${b.user_id}> ! 🎉`, color: COLORS.success })] }).catch(() => {});
      db.prepare('UPDATE birthdays SET last_announced = ? WHERE guild_id = ? AND user_id = ?').run(stamp, b.guild_id, b.user_id);
    }
  }
}
