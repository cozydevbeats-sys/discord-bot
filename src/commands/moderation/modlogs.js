import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

const ICONS = { ban: '🔨', kick: '👢', warn: '⚠️', softban: '🧹', unban: '✅' };

export default {
  data: new SlashCommandBuilder()
    .setName('modlogs')
    .setDescription('Voir l\'historique de sanctions d\'un membre.')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('membre');
    const rows = db.prepare('SELECT * FROM modlog WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC')
      .all(interaction.guild.id, user.id);

    if (rows.length === 0) {
      return interaction.reply({ embeds: [embed({ description: `✅ **${user.tag}** n'a aucune sanction enregistrée.`, color: COLORS.success })] });
    }

    const list = rows.slice(0, 15).map((r) => {
      const icon = ICONS[r.action.split(' ')[0]] || '📝';
      return `${icon} **${r.action}** — ${r.reason}\n└ par <@${r.moderator_id}> · <t:${Math.floor(r.timestamp / 1000)}:R>`;
    }).join('\n\n');

    await interaction.reply({ embeds: [embed({
      title: `📒 Historique de ${user.tag}`,
      description: `**${rows.length}** sanction(s) au total\n\n${list}`,
      thumbnail: user.displayAvatarURL(),
      color: COLORS.warn,
    })] });
  },
};
