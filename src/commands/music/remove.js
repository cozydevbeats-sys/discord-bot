import { SlashCommandBuilder } from 'discord.js';
import { getExistingQueue } from '../../utils/musicPlayer.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Retirer une musique de la file.')
    .addIntegerOption((o) => o.setName('position').setDescription('Position dans la file (voir /queue)').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    const q = getExistingQueue(interaction.guild.id);
    const pos = interaction.options.getInteger('position');
    if (!q || pos > q.tracks.length) {
      return interaction.reply({ embeds: [embed({ description: '❌ Position invalide.', color: COLORS.error })], ephemeral: true });
    }
    const [removed] = q.tracks.splice(pos - 1, 1);
    await interaction.reply({ embeds: [embed({ description: `🗑️ **${removed.title}** retirée de la file.`, color: COLORS.success })] });
  },
};
