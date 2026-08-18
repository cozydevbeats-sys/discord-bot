import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Gérer ton anniversaire.')
    .addSubcommand((s) => s.setName('set').setDescription('Enregistrer ton anniversaire')
      .addIntegerOption((o) => o.setName('jour').setDescription('Jour (1-31)').setRequired(true).setMinValue(1).setMaxValue(31))
      .addIntegerOption((o) => o.setName('mois').setDescription('Mois (1-12)').setRequired(true).setMinValue(1).setMaxValue(12)))
    .addSubcommand((s) => s.setName('remove').setDescription('Retirer ton anniversaire'))
    .addSubcommand((s) => s.setName('list').setDescription('Prochains anniversaires du serveur')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'set') {
      const day = interaction.options.getInteger('jour');
      const month = interaction.options.getInteger('mois');
      // Validation basique du jour selon le mois
      const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
      if (day > maxDays) {
        return interaction.reply({ embeds: [embed({ description: `❌ ${MONTHS[month - 1]} n'a que ${maxDays} jours.`, color: COLORS.error })], ephemeral: true });
      }
      db.prepare('INSERT INTO birthdays (guild_id, user_id, day, month) VALUES (?, ?, ?, ?) ON CONFLICT(guild_id, user_id) DO UPDATE SET day = excluded.day, month = excluded.month')
        .run(gid, interaction.user.id, day, month);
      return interaction.reply({ embeds: [embed({ description: `🎂 Anniversaire enregistré : **${day} ${MONTHS[month - 1]}**.`, color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'remove') {
      db.prepare('DELETE FROM birthdays WHERE guild_id = ? AND user_id = ?').run(gid, interaction.user.id);
      return interaction.reply({ embeds: [embed({ description: '🗑️ Anniversaire retiré.', color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'list') {
      const rows = db.prepare('SELECT * FROM birthdays WHERE guild_id = ?').all(gid);
      if (rows.length === 0) return interaction.reply({ embeds: [embed({ description: 'Aucun anniversaire enregistré.', color: COLORS.info })] });
      // Trie par proximité dans l'année
      const now = new Date();
      const key = (m, d) => {
        const diff = (m - 1 - now.getMonth()) * 31 + (d - now.getDate());
        return diff < 0 ? diff + 372 : diff;
      };
      rows.sort((a, b) => key(a.month, a.day) - key(b.month, b.day));
      const list = rows.slice(0, 15).map((r) => `🎂 <@${r.user_id}> — ${r.day} ${MONTHS[r.month - 1]}`).join('\n');
      return interaction.reply({ embeds: [embed({ title: '🎉 Prochains anniversaires', description: list })] });
    }
  },
};
