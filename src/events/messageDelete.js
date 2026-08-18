import { Events } from 'discord.js';
import { getGuildConfig } from '../database/db.js';
import { embed, COLORS } from '../utils/helpers.js';
import { recordDeletedMessage } from '../utils/snipeCache.js';

export default {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    // Alimente /snipe, indépendamment du salon de logs
    recordDeletedMessage(message);

    const cfg = getGuildConfig(message.guild.id);
    if (!cfg.log_channel) return;
    const channel = message.guild.channels.cache.get(cfg.log_channel);
    if (!channel || channel.id === message.channel.id) return;

    const content = message.content?.slice(0, 1000) || '*(contenu non disponible / média)*';
    await channel.send({ embeds: [embed({
      title: '🗑️ Message supprimé',
      description: `**Auteur :** ${message.author ?? 'inconnu'}\n**Salon :** ${message.channel}\n**Contenu :**\n${content}`,
      color: COLORS.error,
    })] }).catch(() => {});
  },
};
