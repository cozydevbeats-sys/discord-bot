import { SlashCommandBuilder } from 'discord.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Lancer des dés.')
    .addIntegerOption((o) => o.setName('faces').setDescription('Nombre de faces (défaut 6)').setMinValue(2).setMaxValue(1000))
    .addIntegerOption((o) => o.setName('des').setDescription('Nombre de dés (défaut 1)').setMinValue(1).setMaxValue(20)),

  async execute(interaction) {
    const faces = interaction.options.getInteger('faces') || 6;
    const count = interaction.options.getInteger('des') || 1;
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * faces) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);

    await interaction.reply({ embeds: [embed({
      title: `🎲 ${count}d${faces}`,
      description: count > 1 ? `Résultats : ${rolls.join(' + ')} = **${total}**` : `Résultat : **${total}**`,
      color: COLORS.base,
    })] });
  },
};
