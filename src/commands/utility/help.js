import { SlashCommandBuilder } from 'discord.js';
import { embed } from '../../utils/helpers.js';

const CATEGORY_NAMES = {
  moderation: '🔨 Modération',
  leveling: '📊 Niveaux',
  config: '⚙️ Configuration',
  utility: '🛠️ Utilitaires',
  economy: '💰 Économie',
  giveaway: '🎉 Giveaways',
  suggestions: '💡 Suggestions',
  tags: '🏷️ Tags',
  fun: '🎮 Fun',
  pokemon: '🐾 Pokémon',
  music: '🎵 Musique',
};

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Afficher la liste des commandes.'),

  async execute(interaction, client) {
    const byCat = {};
    for (const cmd of client.commands.values()) {
      const cat = cmd.category || 'autre';
      (byCat[cat] ??= []).push(`\`/${cmd.data.name}\``);
    }

    const fields = Object.entries(byCat).map(([cat, cmds]) => ({
      name: CATEGORY_NAMES[cat] || cat,
      value: cmds.join(', '),
      inline: false,
    }));

    await interaction.reply({ embeds: [embed({
      title: '📖 Commandes disponibles',
      description: 'Un bot tout-en-un : modération, niveaux, tickets, rôles-boutons, économie et plus.',
      fields,
    })], ephemeral: true });
  },
};
