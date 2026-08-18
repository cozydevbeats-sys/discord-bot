import {
  SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder,
  ButtonBuilder, ButtonStyle,
} from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Créer un panneau de rôles à réclamer via boutons (max 5).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption((o) => o.setName('titre').setDescription('Titre du panneau').setRequired(true))
    .addStringOption((o) => o.setName('description').setDescription('Description du panneau').setRequired(true))
    .addRoleOption((o) => o.setName('role1').setDescription('Rôle 1').setRequired(true))
    .addStringOption((o) => o.setName('label1').setDescription('Texte du bouton 1').setRequired(true))
    .addRoleOption((o) => o.setName('role2').setDescription('Rôle 2'))
    .addStringOption((o) => o.setName('label2').setDescription('Texte du bouton 2'))
    .addRoleOption((o) => o.setName('role3').setDescription('Rôle 3'))
    .addStringOption((o) => o.setName('label3').setDescription('Texte du bouton 3'))
    .addRoleOption((o) => o.setName('role4').setDescription('Rôle 4'))
    .addStringOption((o) => o.setName('label4').setDescription('Texte du bouton 4'))
    .addRoleOption((o) => o.setName('role5').setDescription('Rôle 5'))
    .addStringOption((o) => o.setName('label5').setDescription('Texte du bouton 5')),

  async execute(interaction) {
    const titre = interaction.options.getString('titre');
    const description = interaction.options.getString('description');

    const pairs = [];
    for (let i = 1; i <= 5; i++) {
      const role = interaction.options.getRole(`role${i}`);
      const label = interaction.options.getString(`label${i}`);
      if (role) pairs.push({ role, label: label || role.name });
    }

    // Vérifie que le bot peut gérer ces rôles
    const botMember = interaction.guild.members.me;
    for (const { role } of pairs) {
      if (role.position >= botMember.roles.highest.position) {
        return interaction.reply({ embeds: [embed({ description: `❌ Le rôle **${role.name}** est au-dessus de mon rôle. Déplace mon rôle plus haut.`, color: COLORS.error })], ephemeral: true });
      }
    }

    const message = await interaction.channel.send({
      embeds: [embed({ title: titre, description })],
    });

    const row = new ActionRowBuilder();
    pairs.forEach(({ role, label }, i) => {
      const customId = `rr:${message.id}:${i}`;
      db.prepare('INSERT INTO reaction_roles (custom_id, guild_id, message_id, role_id, label) VALUES (?, ?, ?, ?, ?)')
        .run(customId, interaction.guild.id, message.id, role.id, label);
      row.addComponents(
        new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Secondary)
      );
    });

    await message.edit({ components: [row] });
    await interaction.reply({ embeds: [embed({ description: '✅ Panneau de rôles créé.', color: COLORS.success })], ephemeral: true });
  },
};
