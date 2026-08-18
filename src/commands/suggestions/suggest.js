import {
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} from 'discord.js';
import db, { getGuildConfig } from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Proposer une suggestion.')
    .addStringOption((o) => o.setName('idee').setDescription('Ta suggestion').setRequired(true)),

  async execute(interaction) {
    const content = interaction.options.getString('idee');
    const cfg = getGuildConfig(interaction.guild.id);

    const channel = cfg.suggestion_channel
      ? interaction.guild.channels.cache.get(cfg.suggestion_channel)
      : interaction.channel;
    if (!channel) {
      return interaction.reply({ embeds: [embed({ description: '❌ Salon de suggestions non configuré (`/config suggestions`).', color: COLORS.error })], ephemeral: true });
    }

    // Insère d'abord pour obtenir l'id
    const info = db.prepare('INSERT INTO suggestions (guild_id, channel_id, author_id, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(interaction.guild.id, channel.id, interaction.user.id, content, 'pending', Date.now());
    const suggestionId = info.lastInsertRowid;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`suggest:up:${suggestionId}`).setLabel('0').setEmoji('👍').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`suggest:down:${suggestionId}`).setLabel('0').setEmoji('👎').setStyle(ButtonStyle.Danger),
    );

    const message = await channel.send({
      embeds: [embed({
        title: `💡 Suggestion #${suggestionId}`,
        description: content,
        footer: `Par ${interaction.user.tag}`,
        color: COLORS.info,
      })],
      components: [row],
    });

    db.prepare('UPDATE suggestions SET message_id = ? WHERE id = ?').run(message.id, suggestionId);
    await interaction.reply({ embeds: [embed({ description: `✅ Suggestion envoyée dans ${channel} !`, color: COLORS.success })], ephemeral: true });
  },
};
