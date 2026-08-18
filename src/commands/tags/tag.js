import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Réponses enregistrées réutilisables.')
    .addSubcommand((s) => s.setName('show').setDescription('Afficher un tag')
      .addStringOption((o) => o.setName('nom').setDescription('Nom du tag').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('Lister les tags du serveur'))
    .addSubcommand((s) => s.setName('create').setDescription('Créer un tag (gestion des messages)')
      .addStringOption((o) => o.setName('nom').setDescription('Nom du tag').setRequired(true))
      .addStringOption((o) => o.setName('contenu').setDescription('Contenu (\\n pour saut de ligne)').setRequired(true)))
    .addSubcommand((s) => s.setName('edit').setDescription('Modifier un tag (gestion des messages)')
      .addStringOption((o) => o.setName('nom').setDescription('Nom du tag').setRequired(true))
      .addStringOption((o) => o.setName('contenu').setDescription('Nouveau contenu').setRequired(true)))
    .addSubcommand((s) => s.setName('delete').setDescription('Supprimer un tag (gestion des messages)')
      .addStringOption((o) => o.setName('nom').setDescription('Nom du tag').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    const canManage = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

    if (sub === 'show') {
      const name = interaction.options.getString('nom').toLowerCase();
      const tag = db.prepare('SELECT * FROM tags WHERE guild_id = ? AND name = ?').get(gid, name);
      if (!tag) return interaction.reply({ embeds: [embed({ description: `❌ Le tag \`${name}\` n'existe pas.`, color: COLORS.error })], ephemeral: true });
      db.prepare('UPDATE tags SET uses = uses + 1 WHERE guild_id = ? AND name = ?').run(gid, name);
      return interaction.reply({ content: tag.content.replaceAll('\\n', '\n') });
    }

    if (sub === 'list') {
      const tags = db.prepare('SELECT name, uses FROM tags WHERE guild_id = ? ORDER BY uses DESC').all(gid);
      if (tags.length === 0) return interaction.reply({ embeds: [embed({ description: 'Aucun tag pour le moment.', color: COLORS.info })] });
      const list = tags.map((t) => `\`${t.name}\` (${t.uses})`).join(', ');
      return interaction.reply({ embeds: [embed({ title: `🏷️ Tags (${tags.length})`, description: list })] });
    }

    // create / edit / delete → permission requise
    if (!canManage) {
      return interaction.reply({ embeds: [embed({ description: '❌ Il te faut la permission « Gérer les messages ».', color: COLORS.error })], ephemeral: true });
    }
    const name = interaction.options.getString('nom').toLowerCase();

    if (sub === 'create') {
      const exists = db.prepare('SELECT 1 FROM tags WHERE guild_id = ? AND name = ?').get(gid, name);
      if (exists) return interaction.reply({ embeds: [embed({ description: `❌ Le tag \`${name}\` existe déjà.`, color: COLORS.error })], ephemeral: true });
      db.prepare('INSERT INTO tags (guild_id, name, content, author_id) VALUES (?, ?, ?, ?)')
        .run(gid, name, interaction.options.getString('contenu'), interaction.user.id);
      return interaction.reply({ embeds: [embed({ description: `✅ Tag \`${name}\` créé.`, color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'edit') {
      const info = db.prepare('UPDATE tags SET content = ? WHERE guild_id = ? AND name = ?')
        .run(interaction.options.getString('contenu'), gid, name);
      if (info.changes === 0) return interaction.reply({ embeds: [embed({ description: `❌ Le tag \`${name}\` n'existe pas.`, color: COLORS.error })], ephemeral: true });
      return interaction.reply({ embeds: [embed({ description: `✅ Tag \`${name}\` modifié.`, color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'delete') {
      const info = db.prepare('DELETE FROM tags WHERE guild_id = ? AND name = ?').run(gid, name);
      if (info.changes === 0) return interaction.reply({ embeds: [embed({ description: `❌ Le tag \`${name}\` n'existe pas.`, color: COLORS.error })], ephemeral: true });
      return interaction.reply({ embeds: [embed({ description: `🗑️ Tag \`${name}\` supprimé.`, color: COLORS.success })], ephemeral: true });
    }
  },
};
