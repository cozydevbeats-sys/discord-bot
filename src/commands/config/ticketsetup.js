import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticketsetup')
    .setDescription('Configurer le système de tickets et poster le panneau.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) => o.setName('categorie').setDescription('Catégorie où créer les tickets').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    .addRoleOption((o) => o.setName('role_support').setDescription('Rôle du staff qui voit les tickets').setRequired(true))
    .addChannelOption((o) => o.setName('logs').setDescription('Salon de logs des tickets').addChannelTypes(ChannelType.GuildText)),

  async execute(interaction) {
    const categorie = interaction.options.getChannel('categorie');
    const support = interaction.options.getRole('role_support');
    const logs = interaction.options.getChannel('logs');

    db.prepare(`
      INSERT INTO ticket_config (guild_id, category_id, support_role, log_channel)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET category_id = excluded.category_id, support_role = excluded.support_role, log_channel = excluded.log_channel
    `).run(interaction.guild.id, categorie.id, support.id, logs?.id ?? null);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket:create').setLabel('Ouvrir un ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary)
    );

    await interaction.channel.send({
      embeds: [embed({
        title: '🎫 Support',
        description: 'Un problème ou une question ? Clique sur le bouton ci-dessous pour ouvrir un ticket privé avec le staff.',
      })],
      components: [row],
    });

    await interaction.reply({ embeds: [embed({ description: '✅ Système de tickets configuré et panneau posté.', color: COLORS.success })], ephemeral: true });
  },
};
