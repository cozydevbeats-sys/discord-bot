import { SlashCommandBuilder } from 'discord.js';
import { getExistingQueue } from '../../utils/musicPlayer.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder().setName('shuffle').setDescription('Mélanger la file d\'attente.'),
  async execute(interaction) {
    const q = getExistingQueue(interaction.guild.id);
    if (!q || q.tracks.length < 2) {
      return interaction.reply({ embeds: [embed({ description: '❌ Pas assez de musiques dans la file.', color: COLORS.error })], ephemeral: true });
    }
    for (let i = q.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q.tracks[i], q.tracks[j]] = [q.tracks[j], q.tracks[i]];
    }
    await interaction.reply({ embeds: [embed({ description: '🔀 File mélangée.', color: COLORS.success })] });
  },
};
