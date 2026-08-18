import { SlashCommandBuilder } from 'discord.js';
import { ITEMS } from '../../data/items.js';
import { embed } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pokeshop')
    .setDescription('Voir la boutique d\'objets Pokémon.'),

  async execute(interaction) {
    const list = Object.values(ITEMS)
      .map((i) => `${i.emoji} **${i.name}** — ${i.price} 🪙\n> ${i.description}`)
      .join('\n\n');

    await interaction.reply({ embeds: [embed({
      title: '🛒 Boutique Pokémon',
      description: list,
      footer: 'Achète avec /pokebuy · utilise avec /pokeitem use',
    })] });
  },
};
