import { SlashCommandBuilder } from 'discord.js';
import { getExistingQueue, formatDuration } from '../../utils/musicPlayer.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder().setName('queue').setDescription('Voir la file d\'attente.'),
  async execute(interaction) {
    const q = getExistingQueue(interaction.guild.id);
    if (!q || (!q.current && q.tracks.length === 0)) {
      return interaction.reply({ embeds: [embed({ description: 'La file est vide.', color: COLORS.info })], ephemeral: true });
    }
    const upcoming = q.tracks.slice(0, 10).map((t, i) => `**${i + 1}.** ${t.title} (${formatDuration(t.duration)})`).join('\n') || '—';
    const more = q.tracks.length > 10 ? `\n... et ${q.tracks.length - 10} de plus` : '';
    await interaction.reply({ embeds: [embed({
      title: '🎵 File d\'attente',
      description: `**En cours :** ${q.current ? q.current.title : '—'}\n\n${upcoming}${more}`,
      footer: `Boucle : ${q.loopMode}  ·  Volume : ${q.volume}%`,
    })] });
  },
};
