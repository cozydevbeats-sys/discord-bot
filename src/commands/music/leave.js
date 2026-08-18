import { SlashCommandBuilder } from 'discord.js';
import { getExistingQueue } from '../../utils/musicPlayer.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder().setName('leave').setDescription('Faire quitter le bot du salon vocal.'),
  async execute(interaction) {
    const q = getExistingQueue(interaction.guild.id);
    if (!q) {
      return interaction.reply({ embeds: [embed({ description: '❌ Je ne suis pas en vocal.', color: COLORS.error })], ephemeral: true });
    }
    q.destroy();
    await interaction.reply({ embeds: [embed({ description: '👋 À plus !', color: COLORS.success })] });
  },
};
