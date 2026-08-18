import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS, parseDuration } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Programmer un rappel.')
    .addStringOption((o) => o.setName('duree').setDescription('ex: 10m, 2h, 1d').setRequired(true))
    .addStringOption((o) => o.setName('texte').setDescription('Le rappel').setRequired(true)),

  async execute(interaction) {
    const durationMs = parseDuration(interaction.options.getString('duree'));
    const content = interaction.options.getString('texte');

    if (!durationMs) {
      return interaction.reply({ embeds: [embed({ description: '❌ Durée invalide. Utilise `10m`, `2h`, `1d`...', color: COLORS.error })], ephemeral: true });
    }

    const remindAt = Date.now() + durationMs;
    db.prepare('INSERT INTO reminders (user_id, channel_id, guild_id, remind_at, content) VALUES (?, ?, ?, ?, ?)')
      .run(interaction.user.id, interaction.channel.id, interaction.guild.id, remindAt, content);

    await interaction.reply({ embeds: [embed({ description: `⏰ Rappel programmé <t:${Math.floor(remindAt / 1000)}:R> :\n> ${content}`, color: COLORS.success })], ephemeral: true });
  },
};
