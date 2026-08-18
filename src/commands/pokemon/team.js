import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';
import { getSpecies } from '../../data/pokedex.js';
import { battleStats } from '../../utils/pokemon.js';

export default {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Gérer ton équipe de combat (jusqu\'à 6 Pokémon).')
    .addSubcommand((s) => s.setName('add').setDescription('Placer un Pokémon dans l\'équipe')
      .addIntegerOption((o) => o.setName('id').setDescription('ID du Pokémon (via /pokemon list)').setRequired(true))
      .addIntegerOption((o) => o.setName('emplacement').setDescription('Emplacement 1 à 6').setRequired(true).setMinValue(1).setMaxValue(6)))
    .addSubcommand((s) => s.setName('remove').setDescription('Retirer le Pokémon d\'un emplacement')
      .addIntegerOption((o) => o.setName('emplacement').setDescription('Emplacement 1 à 6').setRequired(true).setMinValue(1).setMaxValue(6)))
    .addSubcommand((s) => s.setName('view').setDescription('Voir ton équipe et ses PV')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    const uid = interaction.user.id;

    if (sub === 'add') {
      const id = interaction.options.getInteger('id');
      const slot = interaction.options.getInteger('emplacement');
      const mon = db.prepare('SELECT * FROM user_pokemon WHERE id = ? AND guild_id = ? AND user_id = ?').get(id, gid, uid);
      if (!mon) return interaction.reply({ embeds: [embed({ description: '❌ Ce Pokémon ne t\'appartient pas.', color: COLORS.error })], ephemeral: true });

      // Vide l'emplacement visé, retire ce Pokémon d'un éventuel autre emplacement, puis le place
      db.prepare('UPDATE user_pokemon SET team_slot = 0 WHERE guild_id = ? AND user_id = ? AND team_slot = ?').run(gid, uid, slot);
      db.prepare('UPDATE user_pokemon SET team_slot = 0 WHERE id = ?').run(id);
      db.prepare('UPDATE user_pokemon SET team_slot = ? WHERE id = ?').run(slot, id);

      const sp = getSpecies(mon.species_id);
      return interaction.reply({ embeds: [embed({ description: `✅ **${mon.nickname || sp.name}** placé à l'emplacement **${slot}**.`, color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'remove') {
      const slot = interaction.options.getInteger('emplacement');
      const info = db.prepare('UPDATE user_pokemon SET team_slot = 0 WHERE guild_id = ? AND user_id = ? AND team_slot = ?').run(gid, uid, slot);
      if (info.changes === 0) return interaction.reply({ embeds: [embed({ description: '❌ Cet emplacement est déjà vide.', color: COLORS.error })], ephemeral: true });
      return interaction.reply({ embeds: [embed({ description: `🗑️ Emplacement **${slot}** vidé.`, color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'view') {
      const rows = db.prepare('SELECT * FROM user_pokemon WHERE guild_id = ? AND user_id = ? AND team_slot > 0 ORDER BY team_slot ASC').all(gid, uid);
      if (rows.length === 0) {
        return interaction.reply({ embeds: [embed({ description: 'Ton équipe est vide. Ajoute des Pokémon avec `/team add`.', color: COLORS.info })], ephemeral: true });
      }
      const list = rows.map((r) => {
        const sp = getSpecies(r.species_id);
        const stats = battleStats(r);
        const hp = r.current_hp ?? stats.hp;
        return `**${r.team_slot}.** ${r.shiny ? '✨' : ''}${r.nickname || sp.name} — Nv.${r.level}\n${hpBar(hp, stats.hp)} ${hp}/${stats.hp} PV${hp === 0 ? ' 💀 K.O.' : ''}`;
      }).join('\n\n');
      return interaction.reply({ embeds: [embed({ title: `⚔️ Équipe de ${interaction.user.username}`, description: list, footer: 'Soigne les PV bas avec /pokeitem use' })], ephemeral: true });
    }
  },
};

function hpBar(current, max) {
  const filled = Math.max(0, Math.round((current / max) * 10));
  return '🟩'.repeat(filled) + '⬜'.repeat(10 - filled);
}
