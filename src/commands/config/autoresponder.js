import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('autoresponder')
    .setDescription('Réponses automatiques à des mots-clés.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('add').setDescription('Ajouter une réponse auto')
      .addStringOption((o) => o.setName('declencheur').setDescription('Mot ou phrase déclencheur').setRequired(true))
      .addStringOption((o) => o.setName('reponse').setDescription('Réponse du bot').setRequired(true))
      .addStringOption((o) => o.setName('type').setDescription('Correspondance').addChoices(
        { name: 'Contient', value: 'contains' }, { name: 'Exact', value: 'exact' })))
    .addSubcommand((s) => s.setName('remove').setDescription('Supprimer une réponse auto')
      .addIntegerOption((o) => o.setName('id').setDescription('ID de la réponse (via /autoresponder list)').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('Lister les réponses auto')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'add') {
      const trigger = interaction.options.getString('declencheur');
      const response = interaction.options.getString('reponse');
      const type = interaction.options.getString('type') || 'contains';
      db.prepare('INSERT INTO autoresponders (guild_id, trigger, response, match_type) VALUES (?, ?, ?, ?)')
        .run(gid, trigger.toLowerCase(), response, type);
      return interaction.reply({ embeds: [embed({ description: `✅ Réponse auto ajoutée pour « ${trigger} ».`, color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'remove') {
      const id = interaction.options.getInteger('id');
      const info = db.prepare('DELETE FROM autoresponders WHERE id = ? AND guild_id = ?').run(id, gid);
      if (info.changes === 0) return interaction.reply({ embeds: [embed({ description: '❌ ID introuvable.', color: COLORS.error })], ephemeral: true });
      return interaction.reply({ embeds: [embed({ description: `🗑️ Réponse auto #${id} supprimée.`, color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'list') {
      const rows = db.prepare('SELECT * FROM autoresponders WHERE guild_id = ?').all(gid);
      if (rows.length === 0) return interaction.reply({ embeds: [embed({ description: 'Aucune réponse auto.', color: COLORS.info })], ephemeral: true });
      const list = rows.map((r) => `**#${r.id}** [${r.match_type}] « ${r.trigger} » → ${r.response.slice(0, 60)}`).join('\n');
      return interaction.reply({ embeds: [embed({ title: '🤖 Réponses automatiques', description: list })], ephemeral: true });
    }
  },
};
