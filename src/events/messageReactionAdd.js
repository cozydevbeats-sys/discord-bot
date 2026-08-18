import { Events } from 'discord.js';
import db, { getGuildConfig } from '../database/db.js';
import { embed, COLORS } from '../utils/helpers.js';

export default {
  name: Events.MessageReactionAdd,
  async execute(reaction) {
    if (reaction.emoji.name !== '⭐') return;

    // Résout les partials (réactions sur d'anciens messages)
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
    } catch { return; }

    const message = reaction.message;
    if (!message.guild) return;

    const cfg = getGuildConfig(message.guild.id);
    if (!cfg.starboard_channel) return;
    if (message.channel.id === cfg.starboard_channel) return; // pas de starboard sur le starboard

    const starChannel = message.guild.channels.cache.get(cfg.starboard_channel);
    if (!starChannel) return;

    const count = reaction.count || 0;
    const threshold = cfg.star_threshold || 3;
    if (count < threshold) return;

    const content = message.content || '*(pas de texte)*';
    const image = message.attachments.first()?.url;

    const star = db.prepare('SELECT * FROM starboard WHERE original_id = ?').get(message.id);

    const e = embed({
      description: `${content}\n\n[Aller au message](${message.url})`,
      color: 0xffac33,
      footer: `⭐ ${count} · #${message.channel.name}`,
      thumbnail: message.author.displayAvatarURL(),
    });
    e.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() });
    if (image) e.setImage(image);

    if (star) {
      // Met à jour le compteur
      try {
        const existing = await starChannel.messages.fetch(star.starboard_id);
        await existing.edit({ content: `⭐ **${count}**`, embeds: [e] });
      } catch { /* supprimé */ }
    } else {
      const sent = await starChannel.send({ content: `⭐ **${count}**`, embeds: [e] }).catch(() => null);
      if (sent) {
        db.prepare('INSERT INTO starboard (original_id, guild_id, starboard_id) VALUES (?, ?, ?)')
          .run(message.id, message.guild.id, sent.id);
      }
    }
  },
};
