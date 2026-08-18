import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';
import { getSpecies, spriteUrl, RARITY_EMOJI, TOTAL } from '../../data/pokedex.js';
import { xpForNext, battleStats } from '../../utils/pokemon.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pokemon')
    .setDescription('Gérer ta collection de Pokémon.')
    .addSubcommand((s) => s.setName('list').setDescription('Voir tes Pokémon')
      .addIntegerOption((o) => o.setName('page').setDescription('Page (10 par page)').setMinValue(1)))
    .addSubcommand((s) => s.setName('info').setDescription('Détails d\'un de tes Pokémon')
      .addIntegerOption((o) => o.setName('id').setDescription('ID (via /pokemon list)').setRequired(true)))
    .addSubcommand((s) => s.setName('select').setDescription('Choisir ton Pokémon actif (celui qui gagne de l\'XP)')
      .addIntegerOption((o) => o.setName('id').setDescription('ID (via /pokemon list)').setRequired(true)))
    .addSubcommand((s) => s.setName('nickname').setDescription('Renommer un de tes Pokémon')
      .addIntegerOption((o) => o.setName('id').setDescription('ID').setRequired(true))
      .addStringOption((o) => o.setName('nom').setDescription('Surnom (laisse vide pour le retirer)')))
    .addSubcommand((s) => s.setName('release').setDescription('Relâcher un Pokémon (définitif !)')
      .addIntegerOption((o) => o.setName('id').setDescription('ID').setRequired(true)))
    .addSubcommand((s) => s.setName('dex').setDescription('Ta progression Pokédex'))
    .addSubcommand((s) => s.setName('top').setDescription('Classement des dresseurs du serveur')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    const uid = interaction.user.id;

    if (sub === 'list') {
      const page = interaction.options.getInteger('page') || 1;
      const perPage = 10;
      const total = db.prepare('SELECT COUNT(*) AS c FROM user_pokemon WHERE guild_id = ? AND user_id = ?').get(gid, uid).c;
      if (total === 0) return interaction.reply({ embeds: [embed({ description: 'Tu n\'as encore capturé aucun Pokémon ! Rends-toi dans le salon dédié et attends une apparition.', color: COLORS.info })], ephemeral: true });

      const rows = db.prepare('SELECT * FROM user_pokemon WHERE guild_id = ? AND user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?')
        .all(gid, uid, perPage, (page - 1) * perPage);

      const list = rows.map((r) => {
        const sp = getSpecies(r.species_id);
        const star = r.shiny ? '✨' : '';
        const active = r.selected ? ' ⭐' : '';
        const team = r.team_slot ? ` 🎽${r.team_slot}` : '';
        const ko = r.current_hp === 0 ? ' 💀' : '';
        return `**#${r.id}** ${star}${sp.name}${r.nickname ? ` "${r.nickname}"` : ''} — Nv.${r.level}${active}${team}${ko}`;
      }).join('\n');

      return interaction.reply({ embeds: [embed({
        title: `📘 Ta collection (${total} au total)`,
        description: list,
        footer: `Page ${page}/${Math.max(1, Math.ceil(total / perPage))}`,
      })], ephemeral: true });
    }

    if (sub === 'info') {
      const id = interaction.options.getInteger('id');
      const mon = db.prepare('SELECT * FROM user_pokemon WHERE id = ? AND guild_id = ? AND user_id = ?').get(id, gid, uid);
      if (!mon) return interaction.reply({ embeds: [embed({ description: '❌ Ce Pokémon ne t\'appartient pas (vérifie l\'ID avec `/pokemon list`).', color: COLORS.error })], ephemeral: true });
      const sp = getSpecies(mon.species_id);
      const need = xpForNext(mon.level);
      const stats = battleStats(mon);
      const hp = mon.current_hp ?? stats.hp;
      return interaction.reply({ embeds: [embed({
        title: `${mon.shiny ? '✨ ' : ''}${mon.nickname || sp.name} (#${mon.id})`,
        thumbnail: spriteUrl(sp.id, !!mon.shiny),
        fields: [
          { name: 'Espèce', value: sp.name, inline: true },
          { name: 'Types', value: sp.types.join(' / '), inline: true },
          { name: 'Rareté', value: `${RARITY_EMOJI[sp.rarity]} ${sp.rarity}`, inline: true },
          { name: 'Niveau', value: `${mon.level}`, inline: true },
          { name: 'XP', value: `${mon.xp}/${need}`, inline: true },
          { name: 'IV', value: `${mon.iv}/31`, inline: true },
          { name: 'PV', value: `${hp}/${stats.hp}${hp === 0 ? ' 💀 K.O.' : ''}`, inline: true },
          { name: 'Actif', value: mon.selected ? '⭐ Oui' : 'Non', inline: true },
          { name: 'Équipe', value: mon.team_slot ? `🎽 Emplacement ${mon.team_slot}` : '—', inline: true },
        ],
      })], ephemeral: true });
    }

    if (sub === 'select') {
      const id = interaction.options.getInteger('id');
      const mon = db.prepare('SELECT * FROM user_pokemon WHERE id = ? AND guild_id = ? AND user_id = ?').get(id, gid, uid);
      if (!mon) return interaction.reply({ embeds: [embed({ description: '❌ Ce Pokémon ne t\'appartient pas.', color: COLORS.error })], ephemeral: true });
      db.prepare('UPDATE user_pokemon SET selected = 0 WHERE guild_id = ? AND user_id = ?').run(gid, uid);
      db.prepare('UPDATE user_pokemon SET selected = 1 WHERE id = ?').run(id);
      const sp = getSpecies(mon.species_id);
      return interaction.reply({ embeds: [embed({ description: `⭐ **${mon.nickname || sp.name}** est maintenant ton Pokémon actif (il gagnera de l'XP en discutant).`, color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'nickname') {
      const id = interaction.options.getInteger('id');
      const nom = interaction.options.getString('nom') || null;
      const info = db.prepare('UPDATE user_pokemon SET nickname = ? WHERE id = ? AND guild_id = ? AND user_id = ?').run(nom, id, gid, uid);
      if (info.changes === 0) return interaction.reply({ embeds: [embed({ description: '❌ Ce Pokémon ne t\'appartient pas.', color: COLORS.error })], ephemeral: true });
      return interaction.reply({ embeds: [embed({ description: nom ? `✅ Surnommé **${nom}**.` : '✅ Surnom retiré.', color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'release') {
      const id = interaction.options.getInteger('id');
      const mon = db.prepare('SELECT * FROM user_pokemon WHERE id = ? AND guild_id = ? AND user_id = ?').get(id, gid, uid);
      if (!mon) return interaction.reply({ embeds: [embed({ description: '❌ Ce Pokémon ne t\'appartient pas.', color: COLORS.error })], ephemeral: true });
      db.prepare('DELETE FROM user_pokemon WHERE id = ?').run(id);
      const sp = getSpecies(mon.species_id);
      return interaction.reply({ embeds: [embed({ description: `👋 Tu as relâché **${sp.name}** dans la nature.`, color: COLORS.warn })], ephemeral: true });
    }

    if (sub === 'dex') {
      const uniqueCount = db.prepare('SELECT COUNT(DISTINCT species_id) AS c FROM user_pokemon WHERE guild_id = ? AND user_id = ?').get(gid, uid).c;
      const totalCount = db.prepare('SELECT COUNT(*) AS c FROM user_pokemon WHERE guild_id = ? AND user_id = ?').get(gid, uid).c;
      const shinyCount = db.prepare('SELECT COUNT(*) AS c FROM user_pokemon WHERE guild_id = ? AND user_id = ? AND shiny = 1').get(gid, uid).c;
      return interaction.reply({ embeds: [embed({
        title: `📖 Progression Pokédex de ${interaction.user.username}`,
        fields: [
          { name: 'Espèces uniques', value: `${uniqueCount} / ${TOTAL}`, inline: true },
          { name: 'Total capturé', value: `${totalCount}`, inline: true },
          { name: 'Shiny ✨', value: `${shinyCount}`, inline: true },
        ],
      })] });
    }

    if (sub === 'top') {
      const rows = db.prepare('SELECT user_id, COUNT(DISTINCT species_id) AS uniq FROM user_pokemon WHERE guild_id = ? GROUP BY user_id ORDER BY uniq DESC LIMIT 10').all(gid);
      if (rows.length === 0) return interaction.reply({ embeds: [embed({ description: 'Personne n\'a encore capturé de Pokémon.', color: COLORS.info })] });
      const medals = ['🥇', '🥈', '🥉'];
      const list = rows.map((r, i) => `${medals[i] || `**${i + 1}.**`} <@${r.user_id}> — ${r.uniq} espèces`).join('\n');
      return interaction.reply({ embeds: [embed({ title: '🏆 Meilleurs dresseurs', description: list })] });
    }
  },
};
