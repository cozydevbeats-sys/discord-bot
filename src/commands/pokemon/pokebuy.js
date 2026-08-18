import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { ITEMS } from '../../data/items.js';
import { embed, COLORS } from '../../utils/helpers.js';
import { getEco } from '../economy/balance.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pokebuy')
    .setDescription('Acheter un objet Pokémon avec tes pièces.')
    .addStringOption((o) => o.setName('item').setDescription('L\'objet à acheter').setRequired(true)
      .addChoices(...Object.values(ITEMS).map((i) => ({ name: i.name, value: i.id }))))
    .addIntegerOption((o) => o.setName('quantite').setDescription('Quantité (défaut 1)').setMinValue(1).setMaxValue(99)),

  async execute(interaction) {
    const itemId = interaction.options.getString('item');
    const qty = interaction.options.getInteger('quantite') || 1;
    const item = ITEMS[itemId];
    const cost = item.price * qty;

    const eco = getEco(interaction.guild.id, interaction.user.id);
    if (eco.wallet < cost) {
      return interaction.reply({ embeds: [embed({ description: `❌ Il te faut **${cost}** 🪙 (tu as ${eco.wallet}). Essaie \`/daily\` ou \`/work\`.`, color: COLORS.error })], ephemeral: true });
    }

    db.prepare('UPDATE economy SET wallet = wallet - ? WHERE guild_id = ? AND user_id = ?').run(cost, interaction.guild.id, interaction.user.id);
    db.prepare(`
      INSERT INTO user_items (guild_id, user_id, item_id, quantity) VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id, item_id) DO UPDATE SET quantity = quantity + excluded.quantity
    `).run(interaction.guild.id, interaction.user.id, itemId, qty);

    await interaction.reply({ embeds: [embed({ description: `✅ Acheté **${qty}x ${item.emoji} ${item.name}** pour **${cost}** 🪙.`, color: COLORS.success })] });
  },
};
