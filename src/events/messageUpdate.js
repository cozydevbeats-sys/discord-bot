import { Events } from 'discord.js';
import { getGuildConfig } from '../database/db.js';
import { embed, COLORS } from '../utils/helpers.js';

export default {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // embed chargé, pas une vraie édition

    const cfg = getGuildConfig(newMessage.guild.id);
    if (!cfg.log_channel) return;
    const channel = newMessage.guild.channels.cache.get(cfg.log_channel);
    if (!channel) return;

    await channel.send({ embeds: [embed({
      title: '✏️ Message édité',
      description: `**Auteur :** ${newMessage.author}\n**Salon :** ${newMessage.channel} · [aller au message](${newMessage.url})`,
      fields: [
        { name: 'Avant', value: (oldMessage.content || '—').slice(0, 1000), inline: false },
        { name: 'Après', value: (newMessage.content || '—').slice(0, 1000), inline: false },
      ],
      color: COLORS.warn,
    })] }).catch(() => {});
  },
};
