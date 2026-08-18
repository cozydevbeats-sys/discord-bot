import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('richest')
    .setDescription('Classement des plus grosses fortunes du serveur.'),

  async execute(interaction) {
    const rows = db.prepare('SELECT user_id, (wallet + bank) AS total FROM economy WHERE guild_id = ? ORDER BY total DESC LIMIT 10')
      .all(interaction.guild.id).filter((r) => r.total > 0);

    if (rows.length === 0) {
      return interaction.reply({ embeds: [embed({ description: 'Personne n\'a encore de pièces.', color: COLORS.info })] });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const list = rows.map((r, i) => `${medals[i] || `**${i + 1}.**`} <@${r.user_id}> — **${r.total}** 🪙`).join('\n');
    await interaction.reply({ embeds: [embed({ title: '💰 Les plus riches', description: list, color: COLORS.success })] });
  },
};
