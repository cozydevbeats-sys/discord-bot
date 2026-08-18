import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('levelrewards')
    .setDescription('Rôles attribués automatiquement à certains niveaux.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) => s.setName('add').setDescription('Associer un rôle à un niveau')
      .addIntegerOption((o) => o.setName('niveau').setDescription('Le niveau requis').setRequired(true).setMinValue(1))
      .addRoleOption((o) => o.setName('role').setDescription('Le rôle à donner').setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription('Retirer la récompense d\'un niveau')
      .addIntegerOption((o) => o.setName('niveau').setDescription('Le niveau').setRequired(true).setMinValue(1)))
    .addSubcommand((s) => s.setName('list').setDescription('Lister les récompenses de niveau')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'add') {
      const level = interaction.options.getInteger('niveau');
      const role = interaction.options.getRole('role');
      if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ embeds: [embed({ description: `❌ Le rôle **${role.name}** est au-dessus du mien.`, color: COLORS.error })], ephemeral: true });
      }
      db.prepare('INSERT INTO level_rewards (guild_id, level, role_id) VALUES (?, ?, ?) ON CONFLICT(guild_id, level) DO UPDATE SET role_id = excluded.role_id')
        .run(gid, level, role.id);
      return interaction.reply({ embeds: [embed({ description: `✅ ${role} sera donné au niveau **${level}**.`, color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'remove') {
      const level = interaction.options.getInteger('niveau');
      const info = db.prepare('DELETE FROM level_rewards WHERE guild_id = ? AND level = ?').run(gid, level);
      if (info.changes === 0) return interaction.reply({ embeds: [embed({ description: '❌ Aucune récompense à ce niveau.', color: COLORS.error })], ephemeral: true });
      return interaction.reply({ embeds: [embed({ description: `🗑️ Récompense du niveau **${level}** retirée.`, color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'list') {
      const rows = db.prepare('SELECT * FROM level_rewards WHERE guild_id = ? ORDER BY level ASC').all(gid);
      if (rows.length === 0) return interaction.reply({ embeds: [embed({ description: 'Aucune récompense configurée.', color: COLORS.info })] });
      const list = rows.map((r) => `Niveau **${r.level}** → <@&${r.role_id}>`).join('\n');
      return interaction.reply({ embeds: [embed({ title: '🎖️ Récompenses de niveau', description: list })] });
    }
  },
};
