import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { embed, COLORS, sendLog, addModlog } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulser un membre du serveur.')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre à expulser').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison de l\'expulsion'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('membre');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) return interaction.reply({ embeds: [embed({ description: '❌ Membre introuvable.', color: COLORS.error })], ephemeral: true });
    if (!member.kickable) return interaction.reply({ embeds: [embed({ description: '❌ Je ne peux pas expulser ce membre (hiérarchie / permissions).', color: COLORS.error })], ephemeral: true });

    await member.kick(reason);
    addModlog(interaction.guild.id, user.id, interaction.user.id, 'kick', reason);
    await interaction.reply({ embeds: [embed({ title: '👢 Membre expulsé', description: `**${user.tag}** a été expulsé.\n**Raison :** ${reason}`, color: COLORS.warn })] });
    await sendLog(interaction.guild, { title: '👢 Kick', description: `${user.tag} expulsé par ${interaction.user}.\n**Raison :** ${reason}`, color: COLORS.warn });
  },
};
