import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { embed, COLORS, sendLog, addModlog } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Bannir puis débannir un membre pour effacer ses messages récents.')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('membre');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const member = interaction.guild.members.cache.get(user.id);

    if (member && !member.bannable) {
      return interaction.reply({ embeds: [embed({ description: '❌ Impossible (hiérarchie / permissions).', color: COLORS.error })], ephemeral: true });
    }

    await interaction.guild.members.ban(user.id, { reason: `Softban: ${reason}`, deleteMessageSeconds: 7 * 24 * 60 * 60 });
    await interaction.guild.members.unban(user.id, 'Softban (débannissement immédiat)');
    addModlog(interaction.guild.id, user.id, interaction.user.id, 'softban', reason);

    await interaction.reply({ embeds: [embed({ title: '🧹 Softban', description: `**${user.tag}** softban (messages 7j effacés).\n**Raison :** ${reason}`, color: COLORS.warn })] });
    await sendLog(interaction.guild, { title: '🧹 Softban', description: `${user.tag} softban par ${interaction.user}.\n**Raison :** ${reason}`, color: COLORS.warn });
  },
};
