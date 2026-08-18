import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, xpForLevel, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Voir ton niveau et ton XP (ou celui d\'un autre membre).')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre à consulter')),

  async execute(interaction) {
    const user = interaction.options.getUser('membre') || interaction.user;
    const row = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?')
      .get(interaction.guild.id, user.id);

    if (!row) {
      return interaction.reply({ embeds: [embed({ description: `**${user.username}** n'a pas encore d'XP.`, color: COLORS.info })] });
    }

    // Rang dans le classement
    const rank = db.prepare(
      'SELECT COUNT(*) AS r FROM levels WHERE guild_id = ? AND (level > ? OR (level = ? AND xp > ?))'
    ).get(interaction.guild.id, row.level, row.level, row.xp).r + 1;

    const needed = xpForLevel(row.level);
    const filled = Math.round((row.xp / needed) * 12);
    const bar = '▰'.repeat(filled) + '▱'.repeat(12 - filled);

    await interaction.reply({ embeds: [embed({
      title: `📊 Rang de ${user.username}`,
      thumbnail: user.displayAvatarURL(),
      fields: [
        { name: 'Niveau', value: `**${row.level}**`, inline: true },
        { name: 'Classement', value: `**#${rank}**`, inline: true },
        { name: 'XP', value: `${row.xp} / ${needed}`, inline: true },
        { name: 'Progression', value: `${bar}`, inline: false },
      ],
    })] });
  },
};
