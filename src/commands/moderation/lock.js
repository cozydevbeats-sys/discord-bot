import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { embed, COLORS, sendLog } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Verrouiller ou déverrouiller le salon (envoi de messages).')
    .addStringOption((o) => o.setName('action').setDescription('Verrouiller ou déverrouiller').setRequired(true)
      .addChoices({ name: 'Verrouiller', value: 'lock' }, { name: 'Déverrouiller', value: 'unlock' }))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const action = interaction.options.getString('action');
    const lock = action === 'lock';
    const everyone = interaction.guild.roles.everyone;

    await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: lock ? false : null });

    await interaction.reply({ embeds: [embed({
      description: lock ? '🔒 Salon verrouillé.' : '🔓 Salon déverrouillé.',
      color: lock ? COLORS.warn : COLORS.success,
    })] });
    await sendLog(interaction.guild, {
      title: lock ? '🔒 Salon verrouillé' : '🔓 Salon déverrouillé',
      description: `${interaction.channel} par ${interaction.user}.`,
      color: COLORS.info,
    });
  },
};
