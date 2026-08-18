import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Afficher le classement des niveaux du serveur.'),

  async execute(interaction) {
    const rows = db.prepare(
      'SELECT * FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT 10'
    ).all(interaction.guild.id);

    if (rows.length === 0) {
      return interaction.reply({ embeds: [embed({ description: 'Aucune donnée de niveau pour le moment.', color: COLORS.info })] });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const list = rows.map((r, i) =>
      `${medals[i] || `**${i + 1}.**`} <@${r.user_id}> — Niveau **${r.level}** (${r.xp} XP)`
    ).join('\n');

    await interaction.reply({ embeds: [embed({ title: '🏆 Classement des niveaux', description: list, color: COLORS.base })] });
  },
};
