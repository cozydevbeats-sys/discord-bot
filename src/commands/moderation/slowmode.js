import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Définir le mode lent du salon (en secondes, 0 = désactivé).')
    .addIntegerOption((o) => o.setName('secondes').setDescription('0 à 21600').setRequired(true).setMinValue(0).setMaxValue(21600))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const seconds = interaction.options.getInteger('secondes');
    await interaction.channel.setRateLimitPerUser(seconds);
    await interaction.reply({ embeds: [embed({ description: seconds ? `🐌 Mode lent réglé sur **${seconds}s**.` : '⚡ Mode lent désactivé.', color: COLORS.success })] });
  },
};
