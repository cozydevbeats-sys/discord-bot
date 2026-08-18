import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';
import { getSpecies, spriteUrl } from '../../data/pokedex.js';
import { simulateTeamBattle, applyXp } from '../../utils/pokemon.js';

// Ne garde que les Pokémon encore capables de combattre (0 PV = K.O., doit être soigné)
function aliveOnly(team) {
  return team.filter((m) => (m.current_hp ?? 1) !== 0);
}

export default {
  data: new SlashCommandBuilder()
    .setName('pokebattle')
    .setDescription('Combat Pokémon (ton équipe si tu en as une, sinon ton Pokémon actif).')
    .addUserOption((o) => o.setName('adversaire').setDescription('Contre qui ?').setRequired(true)),

  async execute(interaction) {
    const opponent = interaction.options.getUser('adversaire');
    if (opponent.bot || opponent.id === interaction.user.id) {
      return interaction.reply({ embeds: [embed({ description: '❌ Choisis un autre dresseur.', color: COLORS.error })], ephemeral: true });
    }

    const gid = interaction.guild.id;
    const teamA = aliveOnly(db.prepare('SELECT * FROM user_pokemon WHERE guild_id = ? AND user_id = ? AND team_slot > 0 ORDER BY team_slot ASC').all(gid, interaction.user.id));
    const teamB = aliveOnly(db.prepare('SELECT * FROM user_pokemon WHERE guild_id = ? AND user_id = ? AND team_slot > 0 ORDER BY team_slot ASC').all(gid, opponent.id));

    let finalTeamA = teamA;
    let finalTeamB = teamB;

    if (finalTeamA.length === 0) {
      const active = db.prepare('SELECT * FROM user_pokemon WHERE guild_id = ? AND user_id = ? AND selected = 1').get(gid, interaction.user.id);
      if (!active || active.current_hp === 0) {
        return interaction.reply({ embeds: [embed({ description: '❌ Compose une équipe avec `/team add`, choisis un Pokémon actif avec `/pokemon select`, ou soigne-le avec `/pokeitem use`.', color: COLORS.error })], ephemeral: true });
      }
      finalTeamA = [active];
    }
    if (finalTeamB.length === 0) {
      const active = db.prepare('SELECT * FROM user_pokemon WHERE guild_id = ? AND user_id = ? AND selected = 1').get(gid, opponent.id);
      if (!active || active.current_hp === 0) {
        return interaction.reply({ embeds: [embed({ description: `❌ ${opponent.username} n'a aucun Pokémon prêt à combattre.`, color: COLORS.error })], ephemeral: true });
      }
      finalTeamB = [active];
    }

    const { winner, log, finalHpA, finalHpB } = simulateTeamBattle(finalTeamA, finalTeamB);

    // Persiste les PV restants : les Pokémon endommagés le restent jusqu'au prochain soin
    finalTeamA.forEach((mon, i) => db.prepare('UPDATE user_pokemon SET current_hp = ? WHERE id = ?').run(Math.max(0, finalHpA[i]), mon.id));
    finalTeamB.forEach((mon, i) => db.prepare('UPDATE user_pokemon SET current_hp = ? WHERE id = ?').run(Math.max(0, finalHpB[i]), mon.id));

    const winningTeam = winner === 'a' ? finalTeamA : finalTeamB;
    const winningHp = winner === 'a' ? finalHpA : finalHpB;
    const winningUser = winner === 'a' ? interaction.user : opponent;

    let bestMon = winningTeam[0];
    for (let i = 0; i < winningTeam.length; i++) {
      if (winningHp[i] > 0) {
        applyXp(db, winningTeam[i], 25);
        bestMon = winningTeam[i];
      }
    }
    const bestSpecies = getSpecies(bestMon.species_id);
    const survivorsCount = winningHp.filter((hp) => hp > 0).length;

    await interaction.reply({ embeds: [embed({
      title: `⚔️ Combat Pokémon (${finalTeamA.length}v${finalTeamB.length})`,
      description: `${interaction.user} VS ${opponent}\n\n${log.join('\n')}\n\n🏆 **${winningUser}** remporte le combat ! (${survivorsCount} Pokémon encore debout)\n💊 Pense à soigner ton équipe avec \`/pokeitem use\` avant le prochain combat.`,
      thumbnail: spriteUrl(bestSpecies.id, !!bestMon.shiny),
      color: COLORS.success,
    })] });
  },
};
