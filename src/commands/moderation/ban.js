import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { embed, COLORS, sendLog, addModlog } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un membre du serveur.')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre à bannir').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison du bannissement'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('membre');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const member = interaction.guild.members.cache.get(user.id);

    if (member && !member.bannable) {
      return interaction.reply({ embeds: [embed({ description: '❌ Je ne peux pas bannir ce membre (hiérarchie / permissions).', color: COLORS.error })], ephemeral: true });
    }

    await interaction.guild.members.ban(user.id, { reason });
    addModlog(interaction.guild.id, user.id, interaction.user.id, 'ban', reason);
    await interaction.reply({ embeds: [embed({ title: '🔨 Membre banni', description: `**${user.tag}** a été banni.\n**Raison :** ${reason}`, color: COLORS.error })] });
    await sendLog(interaction.guild, { title: '🔨 Ban', description: `${user.tag} banni par ${interaction.user}.\n**Raison :** ${reason}`, color: COLORS.error });
  },
};
