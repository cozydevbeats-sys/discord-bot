import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Voir ou effacer les avertissements d\'un membre.')
    .addSubcommand((s) => s.setName('liste').setDescription('Voir les avertissements')
      .addUserOption((o) => o.setName('membre').setDescription('Le membre').setRequired(true)))
    .addSubcommand((s) => s.setName('clear').setDescription('Effacer tous les avertissements')
      .addUserOption((o) => o.setName('membre').setDescription('Le membre').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('membre');

    if (sub === 'clear') {
      db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?').run(interaction.guild.id, user.id);
      return interaction.reply({ embeds: [embed({ description: `🧹 Avertissements de **${user.tag}** effacés.`, color: COLORS.success })] });
    }

    const rows = db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC')
      .all(interaction.guild.id, user.id);

    if (rows.length === 0) {
      return interaction.reply({ embeds: [embed({ description: `✅ **${user.tag}** n'a aucun avertissement.`, color: COLORS.success })] });
    }

    const list = rows.slice(0, 15).map((w, i) =>
      `**${i + 1}.** ${w.reason} — par <@${w.moderator_id}> (<t:${Math.floor(w.timestamp / 1000)}:R>)`
    ).join('\n');

    await interaction.reply({ embeds: [embed({ title: `⚠️ Avertissements de ${user.tag}`, description: `**${rows.length}** au total\n\n${list}`, color: COLORS.warn })] });
  },
};
