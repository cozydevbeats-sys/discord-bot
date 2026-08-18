import {
  SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder,
  ButtonBuilder, ButtonStyle,
} from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS, parseDuration } from '../../utils/helpers.js';
import { endGiveaway, pickWinners } from '../../utils/giveaways.js';

export default {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Gérer les tirages au sort.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('start').setDescription('Lancer un giveaway')
      .addStringOption((o) => o.setName('lot').setDescription('Ce qu\'on gagne').setRequired(true))
      .addStringOption((o) => o.setName('duree').setDescription('ex: 30m, 2h, 1d').setRequired(true))
      .addIntegerOption((o) => o.setName('gagnants').setDescription('Nombre de gagnants (défaut 1)').setMinValue(1).setMaxValue(20)))
    .addSubcommand((s) => s.setName('end').setDescription('Terminer un giveaway maintenant')
      .addStringOption((o) => o.setName('message_id').setDescription('ID du message du giveaway').setRequired(true)))
    .addSubcommand((s) => s.setName('reroll').setDescription('Retirer un nouveau gagnant')
      .addStringOption((o) => o.setName('message_id').setDescription('ID du message du giveaway').setRequired(true))),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize = interaction.options.getString('lot');
      const durationMs = parseDuration(interaction.options.getString('duree'));
      const winners = interaction.options.getInteger('gagnants') || 1;

      if (!durationMs) {
        return interaction.reply({ embeds: [embed({ description: '❌ Durée invalide. Utilise `30m`, `2h`, `1d`...', color: COLORS.error })], ephemeral: true });
      }

      const endAt = Date.now() + durationMs;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('giveaway:enter').setLabel('Participer').setEmoji('🎉').setStyle(ButtonStyle.Primary)
      );

      const message = await interaction.channel.send({
        embeds: [embed({
          title: '🎉 GIVEAWAY 🎉',
          description: `**Lot :** ${prize}\n**Gagnant(s) :** ${winners}\n**Fin :** <t:${Math.floor(endAt / 1000)}:R>\n**Organisé par :** ${interaction.user}\n\nClique sur **Participer** pour tenter ta chance !`,
        })],
        components: [row],
      });

      db.prepare('INSERT INTO giveaways (message_id, guild_id, channel_id, prize, winners_count, host_id, end_at, ended) VALUES (?, ?, ?, ?, ?, ?, ?, 0)')
        .run(message.id, interaction.guild.id, interaction.channel.id, prize, winners, interaction.user.id, endAt);

      return interaction.reply({ embeds: [embed({ description: '✅ Giveaway lancé !', color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'end') {
      const id = interaction.options.getString('message_id');
      const g = db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(id);
      if (!g) return interaction.reply({ embeds: [embed({ description: '❌ Giveaway introuvable.', color: COLORS.error })], ephemeral: true });
      await endGiveaway(client, id);
      return interaction.reply({ embeds: [embed({ description: '✅ Giveaway terminé.', color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'reroll') {
      const id = interaction.options.getString('message_id');
      const g = db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(id);
      if (!g) return interaction.reply({ embeds: [embed({ description: '❌ Giveaway introuvable.', color: COLORS.error })], ephemeral: true });
      const [winner] = pickWinners(id, 1);
      if (!winner) return interaction.reply({ embeds: [embed({ description: '❌ Aucun participant à retirer.', color: COLORS.error })], ephemeral: true });
      await interaction.reply({ content: `🎉 Nouveau gagnant : <@${winner}> pour **${g.prize}** !` });
    }
  },
};
