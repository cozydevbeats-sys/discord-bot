import {
  Events, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder,
} from 'discord.js';
import db from '../database/db.js';
import { embed, COLORS } from '../utils/helpers.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // ---------- Slash commands ----------
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`[commande ${interaction.commandName}]`, err);
        const payload = {
          embeds: [embed({ description: '❌ Une erreur est survenue.', color: COLORS.error })],
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
        else await interaction.reply(payload).catch(() => {});
      }
      return;
    }

    // ---------- Menu déroulant de rôles ----------
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('rolemenu:')) {
      const menu = db.prepare('SELECT * FROM role_menus WHERE message_id = ?').get(interaction.message.id);
      if (!menu) return interaction.reply({ content: 'Ce menu n\'existe plus.', ephemeral: true });

      const managed = menu.role_ids.split(',');
      const selected = interaction.values;
      const added = [];
      const removed = [];
      for (const roleId of managed) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) continue;
        try {
          if (selected.includes(roleId) && !interaction.member.roles.cache.has(roleId)) {
            await interaction.member.roles.add(role); added.push(role.name);
          } else if (!selected.includes(roleId) && interaction.member.roles.cache.has(roleId)) {
            await interaction.member.roles.remove(role); removed.push(role.name);
          }
        } catch { /* rôle au-dessus du bot, on ignore */ }
      }
      const parts = [];
      if (added.length) parts.push(`➕ ${added.join(', ')}`);
      if (removed.length) parts.push(`➖ ${removed.join(', ')}`);
      return interaction.reply({ content: parts.join('\n') || 'Aucun changement.', ephemeral: true });
    }

    // ---------- Soumission de formulaire (modal) ----------
    if (interaction.isModalSubmit() && interaction.customId === 'ticket:modal') {
      const reason = interaction.fields.getTextInputValue('reason');
      return createTicket(interaction, client, reason);
    }

    // ---------- Boutons ----------
    if (interaction.isButton()) {
      const id = interaction.customId;

      // --- Vérification ---
      if (id === 'verify:go') {
        const cfg = db.prepare('SELECT verify_role FROM guild_config WHERE guild_id = ?').get(interaction.guild.id);
        if (!cfg?.verify_role) return interaction.reply({ content: 'La vérification n\'est pas configurée.', ephemeral: true });
        const role = interaction.guild.roles.cache.get(cfg.verify_role);
        if (!role) return interaction.reply({ content: 'Le rôle de vérification est introuvable.', ephemeral: true });
        if (interaction.member.roles.cache.has(role.id)) {
          return interaction.reply({ content: '✅ Tu es déjà vérifié·e.', ephemeral: true });
        }
        try {
          await interaction.member.roles.add(role);
          return interaction.reply({ content: `✅ Vérifié·e ! Bienvenue.`, ephemeral: true });
        } catch {
          return interaction.reply({ content: '❌ Impossible de te donner le rôle (place mon rôle au-dessus).', ephemeral: true });
        }
      }

      // --- Participer à un giveaway ---
      if (id === 'giveaway:enter') {
        const g = db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(interaction.message.id);
        if (!g || g.ended) return interaction.reply({ content: 'Ce giveaway est terminé.', ephemeral: true });

        const already = db.prepare('SELECT 1 FROM giveaway_entries WHERE message_id = ? AND user_id = ?')
          .get(interaction.message.id, interaction.user.id);
        if (already) {
          db.prepare('DELETE FROM giveaway_entries WHERE message_id = ? AND user_id = ?').run(interaction.message.id, interaction.user.id);
          return interaction.reply({ content: '➖ Tu ne participes plus au giveaway.', ephemeral: true });
        }
        db.prepare('INSERT INTO giveaway_entries (message_id, user_id) VALUES (?, ?)').run(interaction.message.id, interaction.user.id);
        const count = db.prepare('SELECT COUNT(*) AS c FROM giveaway_entries WHERE message_id = ?').get(interaction.message.id).c;
        return interaction.reply({ content: `🎉 Participation enregistrée ! (${count} participant·e·s)`, ephemeral: true });
      }

      // --- Voter une suggestion ---
      if (id.startsWith('suggest:')) {
        const [, dir, sidStr] = id.split(':');
        const sid = parseInt(sidStr, 10);
        const value = dir === 'up' ? 1 : -1;

        const prev = db.prepare('SELECT value FROM suggestion_votes WHERE suggestion_id = ? AND user_id = ?').get(sid, interaction.user.id);
        if (prev && prev.value === value) {
          db.prepare('DELETE FROM suggestion_votes WHERE suggestion_id = ? AND user_id = ?').run(sid, interaction.user.id);
        } else {
          db.prepare('INSERT INTO suggestion_votes (suggestion_id, user_id, value) VALUES (?, ?, ?) ON CONFLICT(suggestion_id, user_id) DO UPDATE SET value = excluded.value')
            .run(sid, interaction.user.id, value);
        }

        const up = db.prepare('SELECT COUNT(*) AS c FROM suggestion_votes WHERE suggestion_id = ? AND value = 1').get(sid).c;
        const down = db.prepare('SELECT COUNT(*) AS c FROM suggestion_votes WHERE suggestion_id = ? AND value = -1').get(sid).c;

        const upBtn = ButtonBuilder.from(interaction.message.components[0].components[0]).setLabel(String(up));
        const downBtn = ButtonBuilder.from(interaction.message.components[0].components[1]).setLabel(String(down));
        const row = new ActionRowBuilder().addComponents(upBtn, downBtn);
        return interaction.update({ components: [row] });
      }

      // --- Échanges de Pokémon ---
      if (id.startsWith('trade:')) {
        const [, action, tradeIdStr] = id.split(':');
        const tradeId = parseInt(tradeIdStr, 10);
        const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(tradeId);

        if (!trade || trade.status !== 'pending') {
          return interaction.reply({ content: 'Cet échange n\'est plus valide.', ephemeral: true });
        }
        if (interaction.user.id !== trade.to_user) {
          return interaction.reply({ content: 'Cet échange ne te concerne pas.', ephemeral: true });
        }

        if (action === 'decline') {
          db.prepare('UPDATE trades SET status = ? WHERE id = ?').run('declined', tradeId);
          await interaction.update({ components: [] });
          return interaction.followUp({ content: '❌ Échange refusé.' });
        }

        // accept : revérifie que les deux Pokémon appartiennent toujours aux bonnes personnes
        const fromMon = db.prepare('SELECT * FROM user_pokemon WHERE id = ?').get(trade.from_pokemon_id);
        const toMon = db.prepare('SELECT * FROM user_pokemon WHERE id = ?').get(trade.to_pokemon_id);
        if (!fromMon || !toMon || fromMon.user_id !== trade.from_user || toMon.user_id !== trade.to_user) {
          db.prepare('UPDATE trades SET status = ? WHERE id = ?').run('failed', tradeId);
          await interaction.update({ components: [] });
          return interaction.followUp({ content: '❌ Échange invalide (un des Pokémon a changé de main entre-temps).' });
        }

        // Échange les propriétaires ; réinitialise sélection/équipe côté nouveaux propriétaires
        db.prepare('UPDATE user_pokemon SET user_id = ?, selected = 0, team_slot = 0 WHERE id = ?').run(trade.to_user, fromMon.id);
        db.prepare('UPDATE user_pokemon SET user_id = ?, selected = 0, team_slot = 0 WHERE id = ?').run(trade.from_user, toMon.id);
        db.prepare('UPDATE trades SET status = ? WHERE id = ?').run('completed', tradeId);

        await interaction.update({ components: [] });
        return interaction.followUp({ content: `✅ Échange conclu entre <@${trade.from_user}> et <@${trade.to_user}> !` });
      }

      // --- Rôles-boutons ---
      if (id.startsWith('rr:')) {
        const rr = db.prepare('SELECT * FROM reaction_roles WHERE custom_id = ?').get(id);
        if (!rr) return interaction.reply({ content: 'Ce rôle n\'existe plus.', ephemeral: true });
        const role = interaction.guild.roles.cache.get(rr.role_id);
        if (!role) return interaction.reply({ content: 'Le rôle est introuvable.', ephemeral: true });

        const member = interaction.member;
        try {
          if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            await interaction.reply({ content: `➖ Rôle **${role.name}** retiré.`, ephemeral: true });
          } else {
            await member.roles.add(role);
            await interaction.reply({ content: `➕ Rôle **${role.name}** ajouté.`, ephemeral: true });
          }
        } catch {
          await interaction.reply({ content: '❌ Je n\'ai pas la permission de gérer ce rôle (place mon rôle au-dessus).', ephemeral: true });
        }
        return;
      }

      // --- Ouvrir un ticket (affiche le formulaire) ---
      if (id === 'ticket:create') {
        const cfg = db.prepare('SELECT * FROM ticket_config WHERE guild_id = ?').get(interaction.guild.id);
        if (!cfg) return interaction.reply({ content: 'Le système de tickets n\'est pas configuré.', ephemeral: true });

        const existing = db.prepare('SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = ?')
          .get(interaction.guild.id, interaction.user.id, 'open');
        if (existing && interaction.guild.channels.cache.has(existing.channel_id)) {
          return interaction.reply({ content: `Tu as déjà un ticket ouvert : <#${existing.channel_id}>`, ephemeral: true });
        }

        const modal = new ModalBuilder().setCustomId('ticket:modal').setTitle('Ouvrir un ticket');
        const input = new TextInputBuilder()
          .setCustomId('reason').setLabel('Décris ta demande').setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }

      // --- Prendre en charge un ticket (claim) ---
      if (id === 'ticket:claim') {
        const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(interaction.channel.id);
        if (!ticket) return interaction.reply({ content: 'Ce salon n\'est pas un ticket.', ephemeral: true });
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
          return interaction.reply({ content: '❌ Réservé au staff.', ephemeral: true });
        }
        if (ticket.claimed_by) return interaction.reply({ content: `Déjà pris en charge par <@${ticket.claimed_by}>.`, ephemeral: true });

        db.prepare('UPDATE tickets SET claimed_by = ? WHERE channel_id = ?').run(interaction.user.id, interaction.channel.id);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket:claim').setLabel('Pris en charge').setEmoji('🙋').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('ticket:close').setLabel('Fermer').setEmoji('🔒').setStyle(ButtonStyle.Danger),
        );
        await interaction.message.edit({ components: [row] }).catch(() => {});
        return interaction.reply({ embeds: [embed({ description: `🙋 Ticket pris en charge par ${interaction.user}.`, color: COLORS.info })] });
      }

      // --- Fermer un ticket (+ transcription) ---
      if (id === 'ticket:close') {
        const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(interaction.channel.id);
        if (!ticket) return interaction.reply({ content: 'Ce salon n\'est pas un ticket.', ephemeral: true });

        await interaction.reply({ embeds: [embed({ description: '🔒 Ticket fermé, transcription en cours puis suppression dans 5 s...' })] });
        db.prepare('UPDATE tickets SET status = ? WHERE channel_id = ?').run('closed', interaction.channel.id);

        // Génère la transcription (jusqu'à 100 messages)
        let transcript = null;
        try {
          const msgs = await interaction.channel.messages.fetch({ limit: 100 });
          const lines = [...msgs.values()].reverse().map((m) =>
            `[${new Date(m.createdTimestamp).toLocaleString('fr-FR')}] ${m.author.tag}: ${m.content || '(embed/média)'}`
          );
          const header = `Transcription du ticket #${interaction.channel.name}\nOuvert par: user ${ticket.user_id}\nFermé par: ${interaction.user.tag}\n${'='.repeat(40)}\n\n`;
          transcript = new AttachmentBuilder(Buffer.from(header + lines.join('\n'), 'utf-8'), { name: `transcript-${interaction.channel.name}.txt` });
        } catch { /* ignore */ }

        const cfg = db.prepare('SELECT * FROM ticket_config WHERE guild_id = ?').get(interaction.guild.id);
        if (cfg?.log_channel) {
          const logCh = interaction.guild.channels.cache.get(cfg.log_channel);
          if (logCh) {
            await logCh.send({
              embeds: [embed({
                title: '🎫 Ticket fermé',
                description: `Ticket de <@${ticket.user_id}> fermé par ${interaction.user}.${ticket.claimed_by ? `\nPris en charge par <@${ticket.claimed_by}>.` : ''}`,
                color: COLORS.warn,
              })],
              files: transcript ? [transcript] : [],
            }).catch(() => {});
          }
        }

        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        return;
      }
    }
  },
};

// Crée le salon de ticket après soumission du formulaire
async function createTicket(interaction, client, reason) {
  const cfg = db.prepare('SELECT * FROM ticket_config WHERE guild_id = ?').get(interaction.guild.id);
  if (!cfg) return interaction.reply({ content: 'Le système de tickets n\'est pas configuré.', ephemeral: true });

  await interaction.deferReply({ ephemeral: true });

  const overwrites = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
  ];
  if (cfg.support_role) {
    overwrites.push({ id: cfg.support_role, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }

  const channel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`.slice(0, 90),
    type: ChannelType.GuildText,
    parent: cfg.category_id || null,
    permissionOverwrites: overwrites,
  });

  db.prepare('INSERT INTO tickets (channel_id, guild_id, user_id, status, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(channel.id, interaction.guild.id, interaction.user.id, 'open', Date.now());

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:claim').setLabel('Prendre en charge').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Fermer').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );

  await channel.send({
    content: `${interaction.user}${cfg.support_role ? ` <@&${cfg.support_role}>` : ''}`,
    embeds: [embed({
      title: '🎫 Nouveau ticket',
      description: `**Demande :**\n${reason}\n\nUn membre du staff va te répondre.`,
    })],
    components: [row],
  });

  await interaction.editReply({ content: `✅ Ticket créé : ${channel}` });
}
