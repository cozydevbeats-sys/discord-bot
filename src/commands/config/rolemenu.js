import {
  SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
} from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rolemenu')
    .setDescription('Créer un menu déroulant de rôles (jusqu\'à 10 ici, multi-choix).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption((o) => o.setName('titre').setDescription('Titre').setRequired(true))
    .addStringOption((o) => o.setName('description').setDescription('Description').setRequired(true))
    .addRoleOption((o) => o.setName('role1').setDescription('Rôle 1').setRequired(true))
    .addRoleOption((o) => o.setName('role2').setDescription('Rôle 2'))
    .addRoleOption((o) => o.setName('role3').setDescription('Rôle 3'))
    .addRoleOption((o) => o.setName('role4').setDescription('Rôle 4'))
    .addRoleOption((o) => o.setName('role5').setDescription('Rôle 5'))
    .addRoleOption((o) => o.setName('role6').setDescription('Rôle 6'))
    .addRoleOption((o) => o.setName('role7').setDescription('Rôle 7'))
    .addRoleOption((o) => o.setName('role8').setDescription('Rôle 8'))
    .addRoleOption((o) => o.setName('role9').setDescription('Rôle 9'))
    .addRoleOption((o) => o.setName('role10').setDescription('Rôle 10')),

  async execute(interaction) {
    const titre = interaction.options.getString('titre');
    const description = interaction.options.getString('description');
    const botTop = interaction.guild.members.me.roles.highest.position;

    const roles = [];
    for (let i = 1; i <= 10; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (role) roles.push(role);
    }
    for (const role of roles) {
      if (role.position >= botTop) {
        return interaction.reply({ embeds: [embed({ description: `❌ Le rôle **${role.name}** est au-dessus du mien.`, color: COLORS.error })], ephemeral: true });
      }
    }

    const message = await interaction.channel.send({ embeds: [embed({ title: titre, description })] });

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`rolemenu:${message.id}`)
      .setPlaceholder('Choisis tes rôles')
      .setMinValues(0)
      .setMaxValues(roles.length)
      .addOptions(roles.map((r) => new StringSelectMenuOptionBuilder().setLabel(r.name).setValue(r.id)));

    await message.edit({ components: [new ActionRowBuilder().addComponents(menu)] });
    db.prepare('INSERT INTO role_menus (message_id, guild_id, role_ids) VALUES (?, ?, ?)')
      .run(message.id, interaction.guild.id, roles.map((r) => r.id).join(','));

    await interaction.reply({ embeds: [embed({ description: '✅ Menu de rôles créé.', color: COLORS.success })], ephemeral: true });
  },
};
