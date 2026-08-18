import { SlashCommandBuilder } from 'discord.js';
import { getExistingQueue } from '../../utils/musicPlayer.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder().setName('clearqueue').setDescription('Vider la file (garde la musique en cours).'),
  async execute(interaction) {
    const q = getExistingQueue(interaction.guild.id);
    if (!q) {
      return interaction.reply({ embeds: [embed({ description: '❌ Aucune file active.', color: COLORS.error })], ephemeral: true });
    }
    q.tracks = [];
    await interaction.reply({ embeds: [embed({ description: '🧹 File vidée.', color: COLORS.success })] });
  },
};
