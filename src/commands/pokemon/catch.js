import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';
import { findSpeciesByGuess, getSpecies, spriteUrl, RARITY_EMOJI } from '../../data/pokedex.js';
import { randomIV, randomCatchLevel } from '../../utils/pokemon.js';
import { ITEMS, FLEE_CHANCE } from '../../data/items.js';

export default {
  data: new SlashCommandBuilder()
    .setName('catch')
    .setDescription('Tenter de capturer le Pokémon sauvage apparu dans ce salon.')
    .addStringOption((o) => o.setName('nom').setDescription('Le nom du Pokémon').setRequired(true))
    .addStringOption((o) => o.setName('balle').setDescription('Ball à utiliser (améliore les chances sur les Pokémon rares)')
      .addChoices(
        { name: 'Poké Ball (gratuite)', value: 'pokeball' },
        { name: 'Super Ball', value: 'great_ball' },
        { name: 'Hyper Ball', value: 'ultra_ball' },
      )),

  async execute(interaction) {
    const spawn = db.prepare('SELECT * FROM pokemon_spawns WHERE channel_id = ?').get(interaction.channel.id);
    if (!spawn) {
      return interaction.reply({ embeds: [embed({ description: 'Aucun Pokémon sauvage ici en ce moment.', color: COLORS.error })], ephemeral: true });
    }

    const guessed = findSpeciesByGuess(interaction.options.getString('nom'));
    const species = getSpecies(spawn.species_id);

    if (!guessed || guessed.id !== species.id) {
      return interaction.reply({ embeds: [embed({ description: '❌ Ce n\'est pas le bon nom, réessaie !', color: COLORS.error })], ephemeral: true });
    }

    // Choix de la Ball : vérifie qu'elle est bien possédée avant de l'utiliser
    const ballChoice = interaction.options.getString('balle') || 'pokeball';
    let ballItem = null;
    if (ballChoice !== 'pokeball') {
      const owned = db.prepare('SELECT quantity FROM user_items WHERE guild_id = ? AND user_id = ? AND item_id = ?')
        .get(interaction.guild.id, interaction.user.id, ballChoice);
      if (!owned || owned.quantity <= 0) {
        return interaction.reply({ embeds: [embed({ description: `❌ Tu n'as pas de **${ITEMS[ballChoice].name}** (achète-la avec \`/pokeshop\`). Réessaie avec la Poké Ball gratuite.`, color: COLORS.error })], ephemeral: true });
      }
      ballItem = ITEMS[ballChoice];
    }

    // Jet de fuite : seuls les Pokémon peu communs et plus ont une chance de s'échapper
    const baseFlee = FLEE_CHANCE[species.rarity] || 0;
    const reduction = ballItem?.fleeReduction || 0;
    const finalFleeChance = baseFlee * (1 - reduction);
    const fled = Math.random() < finalFleeChance;

    // On retire le spawn en premier pour empêcher toute double tentative (course de vitesse)
    const removed = db.prepare('DELETE FROM pokemon_spawns WHERE channel_id = ?').run(interaction.channel.id);
    if (removed.changes === 0) {
      return interaction.reply({ embeds: [embed({ description: 'Trop tard, quelqu\'un d\'autre s\'en est occupé !', color: COLORS.error })], ephemeral: true });
    }

    // La Ball est consommée qu'elle réussisse ou non (comme dans les jeux)
    if (ballItem) {
      db.prepare('UPDATE user_items SET quantity = quantity - 1 WHERE guild_id = ? AND user_id = ? AND item_id = ?')
        .run(interaction.guild.id, interaction.user.id, ballChoice);
    }

    if (fled) {
      try {
        const msg = await interaction.channel.messages.fetch(spawn.message_id);
        await msg.edit({ embeds: [embed({ title: '💨 Enfui !', description: `**${species.name}** s'est échappé...`, thumbnail: spriteUrl(species.id, !!spawn.shiny), color: COLORS.warn })] });
      } catch { /* message déjà supprimé */ }
      return interaction.reply({ embeds: [embed({ description: `💨 **${species.name}** a pris peur et s'est enfui malgré ta ${ballItem ? ballItem.name : 'Poké Ball'} !`, color: COLORS.warn })] });
    }

    const isFirst = db.prepare('SELECT COUNT(*) AS c FROM user_pokemon WHERE guild_id = ? AND user_id = ?')
      .get(interaction.guild.id, interaction.user.id).c === 0;

    const level = randomCatchLevel();
    const iv = randomIV();
    db.prepare('INSERT INTO user_pokemon (guild_id, user_id, species_id, level, xp, iv, shiny, selected, caught_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)')
      .run(interaction.guild.id, interaction.user.id, species.id, level, iv, spawn.shiny, isFirst ? 1 : 0, Date.now());

    try {
      const msg = await interaction.channel.messages.fetch(spawn.message_id);
      await msg.edit({ embeds: [embed({
        title: '✅ Capturé !',
        description: `${interaction.user} a capturé **${species.name}** !`,
        thumbnail: spriteUrl(species.id, !!spawn.shiny),
        color: COLORS.success,
      })] });
    } catch { /* message déjà supprimé */ }

    await interaction.reply({ embeds: [embed({
      title: spawn.shiny ? '✨ Capture SHINY !' : '🎉 Capturé !',
      description: `Tu as attrapé **${species.name}** ${RARITY_EMOJI[species.rarity]} (niveau ${level}, IV ${iv}/31) !`,
      thumbnail: spriteUrl(species.id, !!spawn.shiny),
      color: COLORS.success,
    })] });
  },
};
