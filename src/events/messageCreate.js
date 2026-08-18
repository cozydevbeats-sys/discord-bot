import { Events } from 'discord.js';
import db, { getGuildConfig } from '../database/db.js';
import { xpForLevel, embed, formatMessage, COLORS } from '../utils/helpers.js';
import { runAutomod } from '../utils/automod.js';
import { pickWild, rollShiny, applyXp } from '../utils/pokemon.js';
import { spriteUrl } from '../data/pokedex.js';

const XP_COOLDOWN = 60_000; // 1 min entre deux gains d'XP
const spawnCounters = new Map(); // guild_id -> { count, threshold }

export default {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild || message.author.bot) return;

    const cfg = getGuildConfig(message.guild.id);

    // 1) Auto-modération (si le message est supprimé, on arrête là)
    const moderated = await runAutomod(message, cfg);
    if (moderated) return;

    // 1bis) Spawns Pokémon (si un salon est configuré)
    if (cfg.pokemon_channel) {
      const state = spawnCounters.get(message.guild.id) || { count: 0, threshold: rand(12, 20) };
      state.count++;
      if (state.count >= state.threshold) {
        state.count = 0;
        state.threshold = rand(12, 20);
        await trySpawn(message.guild, cfg.pokemon_channel);
      }
      spawnCounters.set(message.guild.id, state);
    }

    // 2) Système AFK
    // Retour de l'auteur s'il était AFK
    const selfAfk = db.prepare('SELECT * FROM afk WHERE guild_id = ? AND user_id = ?').get(message.guild.id, message.author.id);
    if (selfAfk) {
      db.prepare('DELETE FROM afk WHERE guild_id = ? AND user_id = ?').run(message.guild.id, message.author.id);
      message.reply({ embeds: [embed({ description: `👋 Content de te revoir ${message.author}, ton statut AFK a été retiré.`, color: COLORS.success })] })
        .then((m) => setTimeout(() => m.delete().catch(() => {}), 8000))
        .catch(() => {});
    }
    // Signale les personnes mentionnées qui sont AFK
    if (message.mentions.users.size > 0) {
      const notes = [];
      for (const [uid] of message.mentions.users) {
        const afk = db.prepare('SELECT * FROM afk WHERE guild_id = ? AND user_id = ?').get(message.guild.id, uid);
        if (afk) notes.push(`💤 <@${uid}> est AFK : ${afk.reason} (<t:${Math.floor(afk.since / 1000)}:R>)`);
      }
      if (notes.length) message.reply({ embeds: [embed({ description: notes.join('\n'), color: COLORS.info })] }).catch(() => {});
    }

    // 3) Auto-responders
    const responders = db.prepare('SELECT * FROM autoresponders WHERE guild_id = ?').all(message.guild.id);
    if (responders.length) {
      const content = message.content.toLowerCase();
      for (const r of responders) {
        const hit = r.match_type === 'exact' ? content === r.trigger : content.includes(r.trigger);
        if (hit) {
          message.channel.send(r.response).catch(() => {});
          break; // une seule réponse auto par message
        }
      }
    }

    // 4) Système d'XP
    const now = Date.now();
    let row = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?')
      .get(message.guild.id, message.author.id);

    if (!row) {
      db.prepare('INSERT INTO levels (guild_id, user_id, xp, level, last_message) VALUES (?, ?, 0, 0, 0)')
        .run(message.guild.id, message.author.id);
      row = { xp: 0, level: 0, last_message: 0 };
    }

    if (now - row.last_message < XP_COOLDOWN) return;

    // 4bis) XP du Pokémon actif
    const active = db.prepare('SELECT * FROM user_pokemon WHERE guild_id = ? AND user_id = ? AND selected = 1')
      .get(message.guild.id, message.author.id);
    if (active) {
      const result = applyXp(db, active, Math.floor(Math.random() * 16) + 10); // 10–25 XP
      if (result?.evolvedTo) {
        message.channel.send({ embeds: [embed({
          title: '✨ Évolution !',
          description: `Le Pokémon de ${message.author} évolue en **${result.evolvedTo.name}** !`,
          thumbnail: spriteUrl(result.evolvedTo.id, !!active.shiny),
          color: COLORS.success,
        })] }).catch(() => {});
      }
    }

    const gain = Math.floor(Math.random() * 11) + 15; // 15–25 XP
    let newXp = row.xp + gain;
    let newLevel = row.level;

    // Montée de niveau (potentiellement plusieurs d'un coup)
    while (newXp >= xpForLevel(newLevel)) {
      newXp -= xpForLevel(newLevel);
      newLevel++;
    }

    db.prepare('UPDATE levels SET xp = ?, level = ?, last_message = ? WHERE guild_id = ? AND user_id = ?')
      .run(newXp, newLevel, now, message.guild.id, message.author.id);

    // Annonce de level-up
    if (newLevel > row.level) {
      // Récompenses de rôles pour les niveaux franchis
      const rewards = db.prepare('SELECT * FROM level_rewards WHERE guild_id = ? AND level > ? AND level <= ?')
        .all(message.guild.id, row.level, newLevel);
      const earnedRoles = [];
      for (const rw of rewards) {
        const role = message.guild.roles.cache.get(rw.role_id);
        if (role && !message.member.roles.cache.has(role.id)) {
          await message.member.roles.add(role).catch(() => {});
          earnedRoles.push(role);
        }
      }

      const channel = cfg.level_channel
        ? message.guild.channels.cache.get(cfg.level_channel)
        : message.channel;
      if (channel) {
        let msg = formatMessage(
          cfg.level_up_message || '🎉 GG {user}, tu passes niveau **{level}** !',
          { member: message.member, guild: message.guild, level: newLevel }
        );
        if (earnedRoles.length) msg += `\n🎖️ Nouveau(x) rôle(s) : ${earnedRoles.join(', ')}`;
        channel.send({ embeds: [embed({ description: msg, color: COLORS.success })] }).catch(() => {});
      }
    }
  },
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Fait apparaître un Pokémon sauvage dans le salon configuré (un seul à la fois)
async function trySpawn(guild, channelId) {
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  const active = db.prepare('SELECT * FROM pokemon_spawns WHERE channel_id = ?').get(channelId);
  if (active) return; // déjà un spawn en cours

  const species = pickWild();
  const shiny = rollShiny();

  const message = await channel.send({ embeds: [embed({
    title: '❓ Un Pokémon sauvage apparaît !',
    description: `Devine son nom et attrape-le avec \`/catch nom:<nom>\` !${shiny ? '\n✨ Il brille étrangement...' : ''}`,
    thumbnail: spriteUrl(species.id, shiny),
    color: COLORS.warn,
  })] }).catch(() => null);
  if (!message) return;

  db.prepare('INSERT INTO pokemon_spawns (channel_id, guild_id, species_id, shiny, message_id, spawned_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(channelId, guild.id, species.id, shiny ? 1 : 0, message.id, Date.now());
}
