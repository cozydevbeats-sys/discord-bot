import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { embed, COLORS, sendLog, addModlog } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Débannir un utilisateur via son ID.')
    .addStringOption((o) => o.setName('id').setDescription('ID de l\'utilisateur').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const id = interaction.options.getString('id');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    const ban = await interaction.guild.bans.fetch(id).catch(() => null);
    if (!ban) {
      return interaction.reply({ embeds: [embed({ description: '❌ Aucun bannissement trouvé pour cet ID.', color: COLORS.error })], ephemeral: true });
    }

    await interaction.guild.members.unban(id, reason);
    addModlog(interaction.guild.id, id, interaction.user.id, 'unban', reason);
    await interaction.reply({ embeds: [embed({ title: '✅ Débanni', description: `**${ban.user.tag}** a été débanni.\n**Raison :** ${reason}`, color: COLORS.success })] });
    await sendLog(interaction.guild, { title: '✅ Unban', description: `${ban.user.tag} débanni par ${interaction.user}.`, color: COLORS.success });
  },
};
