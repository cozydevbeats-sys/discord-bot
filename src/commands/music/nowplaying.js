import { SlashCommandBuilder } from 'discord.js';
import { getExistingQueue, formatDuration } from '../../utils/musicPlayer.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('Voir la musique en cours.'),
  async execute(interaction) {
    const q = getExistingQueue(interaction.guild.id);
    if (!q?.current) {
      return interaction.reply({ embeds: [embed({ description: 'Rien ne joue actuellement.', color: COLORS.info })], ephemeral: true });
    }
    const elapsed = q.resource?.playbackDuration ? Math.floor(q.resource.playbackDuration / 1000) : 0;
    await interaction.reply({ embeds: [embed({
      title: '🎶 En cours de lecture',
      description: `**${q.current.title}**\n${formatDuration(elapsed)} / ${formatDuration(q.current.duration)}\nDemandé par ${q.current.requestedBy}`,
      color: COLORS.success,
    })] });
  },
};
