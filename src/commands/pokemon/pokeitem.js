import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { ITEMS } from '../../data/items.js';
import { embed, COLORS } from '../../utils/helpers.js';
import { getSpecies, spriteUrl } from '../../data/pokedex.js';
import { battleStats, applyXp, xpForNext } from '../../utils/pokemon.js';

const USABLE_ITEMS = Object.values(ITEMS).filter((i) => i.type !== 'ball');

export default {
  data: new SlashCommandBuilder()
    .setName('pokeitem')
    .setDescription('Gérer et utiliser tes objets Pokémon.')
    .addSubcommand((s) => s.setName('list').setDescription('Voir ton inventaire'))
    .addSubcommand((s) => s.setName('use').setDescription('Utiliser un objet sur un Pokémon')
      .addStringOption((o) => o.setName('item').setDescription('L\'objet').setRequired(true)
        .addChoices(...USABLE_ITEMS.map((i) => ({ name: i.name, value: i.id }))))
      .addIntegerOption((o) => o.setName('id').setDescription('ID du Pokémon (via /pokemon list)').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    const uid = interaction.user.id;

    if (sub === 'list') {
      const rows = db.prepare('SELECT * FROM user_items WHERE guild_id = ? AND user_id = ? AND quantity > 0').all(gid, uid);
      if (rows.length === 0) return interaction.reply({ embeds: [embed({ description: 'Ton inventaire est vide. Regarde `/pokeshop` !', color: COLORS.info })], ephemeral: true });
      const list = rows.map((r) => { const it = ITEMS[r.item_id]; return `${it.emoji} **${it.name}** x${r.quantity}`; }).join('\n');
      return interaction.reply({ embeds: [embed({ title: '🎒 Ton inventaire', description: list })], ephemeral: true });
    }

    // use
    const itemId = interaction.options.getString('item');
    const monId = interaction.options.getInteger('id');
    const item = ITEMS[itemId];

    const owned = db.prepare('SELECT quantity FROM user_items WHERE guild_id = ? AND user_id = ? AND item_id = ?').get(gid, uid, itemId);
    if (!owned || owned.quantity <= 0) {
      return interaction.reply({ embeds: [embed({ description: `❌ Tu n'as pas de **${item.name}** (achète-le avec \`/pokeshop\` puis \`/pokebuy\`).`, color: COLORS.error })], ephemeral: true });
    }

    const mon = db.prepare('SELECT * FROM user_pokemon WHERE id = ? AND guild_id = ? AND user_id = ?').get(monId, gid, uid);
    if (!mon) return interaction.reply({ embeds: [embed({ description: '❌ Ce Pokémon ne t\'appartient pas.', color: COLORS.error })], ephemeral: true });

    const species = getSpecies(mon.species_id);
    let resultMsg;

    if (item.type === 'heal') {
      const stats = battleStats(mon);
      const current = mon.current_hp ?? stats.hp;
      if (current >= stats.hp) {
        return interaction.reply({ embeds: [embed({ description: `**${species.name}** est déjà au maximum de ses PV.`, color: COLORS.info })], ephemeral: true });
      }
      const healed = item.amount === Infinity ? stats.hp : Math.min(stats.hp, current + item.amount);
      db.prepare('UPDATE user_pokemon SET current_hp = ? WHERE id = ?').run(healed, mon.id);
      resultMsg = `${item.emoji} PV de **${species.name}** restaurés : ${healed}/${stats.hp}.`;
    } else if (item.type === 'levelup') {
      applyXp(db, mon, xpForNext(mon.level));
      resultMsg = `${item.emoji} **${species.name}** gagne un niveau instantanément !`;
    } else if (item.type === 'evolve') {
      if (!species.evolvesTo) {
        return interaction.reply({ embeds: [embed({ description: `❌ **${species.name}** ne peut pas évoluer davantage.`, color: COLORS.error })], ephemeral: true });
      }
      const evolved = getSpecies(species.evolvesTo);
      db.prepare('UPDATE user_pokemon SET species_id = ? WHERE id = ?').run(evolved.id, mon.id);
      resultMsg = `${item.emoji} **${species.name}** évolue en **${evolved.name}** !`;
    }

    db.prepare('UPDATE user_items SET quantity = quantity - 1 WHERE guild_id = ? AND user_id = ? AND item_id = ?').run(gid, uid, itemId);

    await interaction.reply({ embeds: [embed({ description: resultMsg, thumbnail: spriteUrl(mon.species_id, !!mon.shiny), color: COLORS.success })] });
  },
};
