import { SlashCommandBuilder } from 'discord.js';
import { getExistingQueue } from '../../utils/musicPlayer.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Régler le volume de la musique (0 à 100).')
    .addIntegerOption((o) => o.setName('niveau').setDescription('0 à 100').setRequired(true).setMinValue(0).setMaxValue(100)),
  async execute(interaction) {
    const q = getExistingQueue(interaction.guild.id);
    if (!q) {
      return interaction.reply({ embeds: [embed({ description: '❌ Aucune musique active.', color: COLORS.error })], ephemeral: true });
    }
    const niveau = interaction.options.getInteger('niveau');
    q.setVolume(niveau);
    await interaction.reply({ embeds: [embed({ description: `🔊 Volume réglé sur **${niveau}%**.`, color: COLORS.success })] });
  },
};
