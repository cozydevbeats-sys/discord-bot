import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../database/db.js';
import { embed, COLORS } from './helpers.js';

export function pickWinners(messageId, count) {
  const entries = db.prepare('SELECT user_id FROM giveaway_entries WHERE message_id = ?').all(messageId);
  const pool = entries.map((e) => e.user_id);
  const winners = [];
  while (winners.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(i, 1)[0]);
  }
  return winners;
}

// Termine un giveaway : tire au sort, édite le message, annonce les gagnants
export async function endGiveaway(client, messageId) {
  const g = db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(messageId);
  if (!g || g.ended) return;

  db.prepare('UPDATE giveaways SET ended = 1 WHERE message_id = ?').run(messageId);

  const channel = await client.channels.fetch(g.channel_id).catch(() => null);
  if (!channel) return;
  const message = await channel.messages.fetch(messageId).catch(() => null);

  const winners = pickWinners(messageId, g.winners_count);
  const winnersText = winners.length ? winners.map((id) => `<@${id}>`).join(', ') : 'Personne (aucun participant)';

  if (message) {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('giveaway:enter').setLabel('Terminé').setEmoji('🎉').setStyle(ButtonStyle.Secondary).setDisabled(true)
    );
    await message.edit({
      embeds: [embed({
        title: '🎉 GIVEAWAY TERMINÉ 🎉',
        description: `**Lot :** ${g.prize}\n**Gagnant(s) :** ${winnersText}\n**Organisé par :** <@${g.host_id}>`,
        color: COLORS.warn,
      })],
      components: [disabledRow],
    }).catch(() => {});
  }

  await channel.send({
    content: winners.length ? `🎉 Félicitations ${winnersText} ! Vous gagnez **${g.prize}** !` : `Aucun participant pour **${g.prize}**.`,
  }).catch(() => {});
}
