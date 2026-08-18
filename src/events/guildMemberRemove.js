import { Events } from 'discord.js';
import { getGuildConfig } from '../database/db.js';
import { embed, formatMessage, COLORS } from '../utils/helpers.js';

export default {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const cfg = getGuildConfig(member.guild.id);
    if (!cfg.leave_channel) return;
    const channel = member.guild.channels.cache.get(cfg.leave_channel);
    if (!channel) return;

    const msg = formatMessage(
      cfg.leave_message || '{username} a quitté le serveur. Nous sommes maintenant {membercount}.',
      { member, guild: member.guild }
    );
    await channel.send({
      embeds: [embed({ title: '👋 Départ', description: msg, color: COLORS.warn })],
    }).catch(() => {});
  },
};
