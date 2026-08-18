import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Voir le suivi des invitations du serveur.')
    .addSubcommand((s) => s.setName('voir').setDescription('Voir combien de membres un utilisateur a invités')
      .addUserOption((o) => o.setName('membre').setDescription('Le membre (toi par défaut)')))
    .addSubcommand((s) => s.setName('top').setDescription('Classement des meilleurs inviteurs')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'voir') {
      const user = interaction.options.getUser('membre') || interaction.user;
      const count = db.prepare('SELECT COUNT(*) AS c FROM invite_tracking WHERE guild_id = ? AND inviter_id = ?')
        .get(gid, user.id).c;
      return interaction.reply({ embeds: [embed({
        description: `${user} a invité **${count}** membre${count > 1 ? 's' : ''} sur ce serveur.`,
        color: COLORS.info,
      })] });
    }

    // top
    const rows = db.prepare(`
      SELECT inviter_id, COUNT(*) AS c FROM invite_tracking
      WHERE guild_id = ? AND inviter_id IS NOT NULL
      GROUP BY inviter_id ORDER BY c DESC LIMIT 10
    `).all(gid);

    if (rows.length === 0) {
      return interaction.reply({ embeds: [embed({ description: 'Aucune invitation suivie pour l\'instant.', color: COLORS.info })] });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const list = rows.map((r, i) => `${medals[i] || `**${i + 1}.**`} <@${r.inviter_id}> — ${r.c} invitation${r.c > 1 ? 's' : ''}`).join('\n');
    await interaction.reply({ embeds: [embed({ title: '📨 Meilleurs inviteurs', description: list })] });
  },
};
