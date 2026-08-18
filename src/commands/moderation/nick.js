import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Changer le pseudo d\'un membre (vide = réinitialiser).')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre').setRequired(true))
    .addStringOption((o) => o.setName('pseudo').setDescription('Nouveau pseudo (laisse vide pour réinitialiser)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async execute(interaction) {
    const user = interaction.options.getUser('membre');
    const pseudo = interaction.options.getString('pseudo') || null;
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) return interaction.reply({ embeds: [embed({ description: '❌ Membre introuvable.', color: COLORS.error })], ephemeral: true });
    if (!member.manageable) return interaction.reply({ embeds: [embed({ description: '❌ Impossible (hiérarchie / permissions).', color: COLORS.error })], ephemeral: true });

    await member.setNickname(pseudo);
    await interaction.reply({ embeds: [embed({ description: pseudo ? `✅ Pseudo de **${user.tag}** changé en **${pseudo}**.` : `✅ Pseudo de **${user.tag}** réinitialisé.`, color: COLORS.success })] });
  },
};
