import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Gérer une suggestion (staff).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('approve').setDescription('Approuver une suggestion')
      .addIntegerOption((o) => o.setName('id').setDescription('Numéro de la suggestion').setRequired(true))
      .addStringOption((o) => o.setName('raison').setDescription('Commentaire du staff')))
    .addSubcommand((s) => s.setName('deny').setDescription('Refuser une suggestion')
      .addIntegerOption((o) => o.setName('id').setDescription('Numéro de la suggestion').setRequired(true))
      .addStringOption((o) => o.setName('raison').setDescription('Commentaire du staff'))),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const id = interaction.options.getInteger('id');
    const raison = interaction.options.getString('raison');

    const sug = db.prepare('SELECT * FROM suggestions WHERE id = ? AND guild_id = ?').get(id, interaction.guild.id);
    if (!sug) return interaction.reply({ embeds: [embed({ description: '❌ Suggestion introuvable.', color: COLORS.error })], ephemeral: true });

    const approved = sub === 'approve';
    db.prepare('UPDATE suggestions SET status = ? WHERE id = ?').run(approved ? 'approved' : 'denied', id);

    // Met à jour le message d'origine
    try {
      const channel = await client.channels.fetch(sug.channel_id);
      const message = await channel.messages.fetch(sug.message_id);
      const up = db.prepare('SELECT COUNT(*) AS c FROM suggestion_votes WHERE suggestion_id = ? AND value = 1').get(id).c;
      const down = db.prepare('SELECT COUNT(*) AS c FROM suggestion_votes WHERE suggestion_id = ? AND value = -1').get(id).c;
      await message.edit({
        embeds: [embed({
          title: `💡 Suggestion #${id} — ${approved ? '✅ Approuvée' : '❌ Refusée'}`,
          description: `${sug.content}\n\n**Votes :** 👍 ${up} · 👎 ${down}${raison ? `\n**Staff :** ${raison}` : ''}`,
          footer: `Par ${(await client.users.fetch(sug.author_id)).tag}`,
          color: approved ? COLORS.success : COLORS.error,
        })],
        components: [],
      });
    } catch { /* message supprimé, on ignore */ }

    await interaction.reply({ embeds: [embed({ description: `✅ Suggestion #${id} ${approved ? 'approuvée' : 'refusée'}.`, color: approved ? COLORS.success : COLORS.error })], ephemeral: true });
  },
};
