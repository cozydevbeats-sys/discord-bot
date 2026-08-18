import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reminders')
    .setDescription('Voir ou annuler tes rappels.')
    .addSubcommand((s) => s.setName('list').setDescription('Lister tes rappels'))
    .addSubcommand((s) => s.setName('delete').setDescription('Annuler un rappel')
      .addIntegerOption((o) => o.setName('id').setDescription('ID du rappel (via /reminders list)').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const rows = db.prepare('SELECT * FROM reminders WHERE user_id = ? ORDER BY remind_at ASC')
        .all(interaction.user.id);
      if (rows.length === 0) return interaction.reply({ embeds: [embed({ description: 'Tu n\'as aucun rappel en attente.', color: COLORS.info })], ephemeral: true });
      const list = rows.map((r) => `**#${r.id}** <t:${Math.floor(r.remind_at / 1000)}:R> — ${r.content.slice(0, 80)}`).join('\n');
      return interaction.reply({ embeds: [embed({ title: '⏰ Tes rappels', description: list })], ephemeral: true });
    }

    // delete
    const id = interaction.options.getInteger('id');
    const info = db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?').run(id, interaction.user.id);
    if (info.changes === 0) return interaction.reply({ embeds: [embed({ description: '❌ Rappel introuvable (ou pas le tien).', color: COLORS.error })], ephemeral: true });
    return interaction.reply({ embeds: [embed({ description: `🗑️ Rappel #${id} annulé.`, color: COLORS.success })], ephemeral: true });
  },
};
