import { SlashCommandBuilder } from 'discord.js';
import { getExistingQueue } from '../../utils/musicPlayer.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder().setName('stop').setDescription('Arrêter la musique, vider la file et quitter le vocal.'),
  async execute(interaction) {
    const queue = getExistingQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({ embeds: [embed({ description: '❌ Rien à arrêter.', color: COLORS.error })], ephemeral: true });
    }
    queue.destroy();
    await interaction.reply({ embeds: [embed({ description: '⏹️ Musique arrêtée, file vidée.', color: COLORS.success })] });
  },
};
