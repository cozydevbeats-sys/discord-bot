import {
  SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder,
  ButtonBuilder, ButtonStyle,
} from 'discord.js';
import { setGuildConfig } from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('verifysetup')
    .setDescription('Poster un panneau de vérification (bouton → rôle).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((o) => o.setName('role').setDescription('Rôle donné après vérification').setRequired(true))
    .addStringOption((o) => o.setName('titre').setDescription('Titre du panneau'))
    .addStringOption((o) => o.setName('description').setDescription('Texte du panneau')),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const titre = interaction.options.getString('titre') || '✅ Vérification';
    const description = interaction.options.getString('description') || 'Clique sur le bouton ci-dessous pour accéder au serveur.';

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ embeds: [embed({ description: `❌ Le rôle **${role.name}** est au-dessus du mien.`, color: COLORS.error })], ephemeral: true });
    }

    setGuildConfig(interaction.guild.id, 'verify_role', role.id);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify:go').setLabel('Je vérifie').setEmoji('✅').setStyle(ButtonStyle.Success)
    );

    await interaction.channel.send({ embeds: [embed({ title: titre, description })], components: [row] });
    await interaction.reply({ embeds: [embed({ description: `✅ Panneau de vérification posté (rôle ${role}).`, color: COLORS.success })], ephemeral: true });
  },
};
