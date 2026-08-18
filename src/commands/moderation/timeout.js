import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { embed, COLORS, sendLog, addModlog } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Rendre un membre muet (timeout) pendant une durée.')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre à mute').setRequired(true))
    .addIntegerOption((o) => o.setName('minutes').setDescription('Durée en minutes (max 40320 = 28j)').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption((o) => o.setName('raison').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('membre');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) return interaction.reply({ embeds: [embed({ description: '❌ Membre introuvable.', color: COLORS.error })], ephemeral: true });
    if (!member.moderatable) return interaction.reply({ embeds: [embed({ description: '❌ Je ne peux pas mute ce membre (hiérarchie / permissions).', color: COLORS.error })], ephemeral: true });

    await member.timeout(minutes * 60_000, reason);
    addModlog(interaction.guild.id, user.id, interaction.user.id, `timeout ${minutes}min`, reason);
    await interaction.reply({ embeds: [embed({ title: '🔇 Membre mute', description: `**${user.tag}** est mute pour **${minutes} min**.\n**Raison :** ${reason}`, color: COLORS.warn })] });
    await sendLog(interaction.guild, { title: '🔇 Timeout', description: `${user.tag} mute ${minutes} min par ${interaction.user}.\n**Raison :** ${reason}`, color: COLORS.warn });
  },
};
