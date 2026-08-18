import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';
import { findSpeciesByGuess, getSpecies, spriteUrl, RARITY_EMOJI, IS_FULL_DEX, TOTAL } from '../../data/pokedex.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pokedex')
    .setDescription('Voir la fiche Pokédex d\'un Pokémon.')
    .addStringOption((o) => o.setName('nom').setDescription('Nom ou numéro du Pokémon').setRequired(true)),

  async execute(interaction) {
    const input = interaction.options.getString('nom').trim();
    const species = /^\d+$/.test(input) ? getSpecies(parseInt(input, 10)) : findSpeciesByGuess(input);

    if (!species) {
      const hint = IS_FULL_DEX ? '' : ' (Pokédex Gen 1 uniquement pour l\'instant — voir `npm run fetch-pokedex` pour débloquer les 1025)';
      return interaction.reply({ embeds: [embed({ description: `❌ Pokémon introuvable${hint}.`, color: COLORS.error })], ephemeral: true });
    }

    const owned = db.prepare('SELECT COUNT(*) AS c FROM user_pokemon WHERE guild_id = ? AND user_id = ? AND species_id = ?')
      .get(interaction.guild.id, interaction.user.id, species.id).c;

    const evo = species.evolvesTo ? getSpecies(species.evolvesTo) : null;

    await interaction.reply({ embeds: [embed({
      title: `#${String(species.id).padStart(4, '0')} ${species.name}`,
      thumbnail: spriteUrl(species.id),
      fields: [
        { name: 'Types', value: species.types.join(' / '), inline: true },
        { name: 'Rareté', value: `${RARITY_EMOJI[species.rarity]} ${species.rarity}`, inline: true },
        { name: 'Tu en as', value: `${owned}`, inline: true },
        ...(evo ? [{ name: 'Évolution', value: `→ **${evo.name}** au niveau ${species.evolveLevel}`, inline: false }] : []),
      ],
      footer: IS_FULL_DEX ? `Pokédex national · ${TOTAL} Pokémon` : `Pokédex Gen 1 · ${TOTAL} Pokémon`,
    })] });
  },
};
