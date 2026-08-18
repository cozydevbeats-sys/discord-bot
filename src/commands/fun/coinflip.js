import { SlashCommandBuilder } from 'discord.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Pile ou face.'),

  async execute(interaction) {
    const result = Math.random() < 0.5 ? 'Pile' : 'Face';
    const emoji = result === 'Pile' ? '🪙' : '💰';
    await interaction.reply({ embeds: [embed({ title: `${emoji} ${result} !`, color: COLORS.base })] });
  },
};
