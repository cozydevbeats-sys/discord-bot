import { POKEDEX, getSpecies, baseStats, effectiveness } from '../data/pokedex.js';

const RARITY_WEIGHT = { common: 100, uncommon: 40, rare: 12, legendary: 1 };
export const SHINY_ODDS = 512;

// Choisit une espèce sauvage pondérée par la rareté
export function pickWild() {
  const pool = [];
  for (const p of POKEDEX) pool.push([p, RARITY_WEIGHT[p.rarity]]);
  const total = pool.reduce((a, [, w]) => a + w, 0);
  let roll = Math.random() * total;
  for (const [p, w] of pool) {
    roll -= w;
    if (roll <= 0) return p;
  }
  return POKEDEX[0];
}

export const rollShiny = () => Math.floor(Math.random() * SHINY_ODDS) === 0;
export const randomIV = () => Math.floor(Math.random() * 32);       // 0–31
export const randomCatchLevel = () => Math.floor(Math.random() * 15) + 1; // 1–15

// XP nécessaire pour passer au niveau suivant
export const xpForNext = (level) => 40 + level * 20;

// Statistiques de combat d'un Pokémon capturé
export function battleStats(mon) {
  const species = getSpecies(mon.species_id);
  const base = baseStats(species);
  const atk = Math.round(base.pow * (1 + mon.level * 0.06) + mon.iv);
  const hp = Math.round(base.hp * (1 + mon.level * 0.08) + mon.iv * 2);
  return { atk, hp, species };
}

// Simule un combat entre deux Pokémon capturés → { winner: 'a'|'b', log: [] }
export function simulateBattle(a, b) {
  const sa = battleStats(a);
  const sb = battleStats(b);
  let hpA = sa.hp;
  let hpB = sb.hp;
  const log = [];
  let turn = Math.random() < 0.5 ? 'a' : 'b';

  for (let i = 0; i < 40 && hpA > 0 && hpB > 0; i++) {
    const [atkMon, atkStats, defStats] = turn === 'a' ? [a, sa, sb] : [b, sb, sa];
    // Meilleur multiplicateur parmi les types de l'attaquant
    const mult = Math.max(...atkStats.species.types.map((t) => effectiveness(t, defStats.species.types)));
    const variance = 0.85 + Math.random() * 0.3;
    let dmg = Math.max(1, Math.round(atkStats.atk * 0.35 * (mult || 0.25) * variance));
    if (turn === 'a') hpB -= dmg; else hpA -= dmg;
    const eff = mult > 1 ? ' (super efficace !)' : mult < 1 && mult > 0 ? ' (peu efficace)' : mult === 0 ? ' (sans effet)' : '';
    log.push(`${atkStats.species.name} inflige **${dmg}**${eff}`);
    turn = turn === 'a' ? 'b' : 'a';
  }

  const winner = hpA > hpB ? 'a' : 'b';
  return { winner, log: log.slice(-6), hpA: Math.max(0, hpA), hpB: Math.max(0, hpB) };
}

// Simule un combat d'équipe : chaque camp combat avec son Pokémon de tête,
// passe automatiquement au suivant dès qu'un Pokémon est mis K.O.
// Renvoie { winner: 'a'|'b', log: [], finalHpA: [], finalHpB: [] } — les PV finaux
// par Pokémon sont destinés à être persistés (combat suivant repart d'où on en était).
export function simulateTeamBattle(teamA, teamB) {
  const statsA = teamA.map((m) => battleStats(m));
  const statsB = teamB.map((m) => battleStats(m));
  const hpA = teamA.map((m, i) => m.current_hp ?? statsA[i].hp);
  const hpB = teamB.map((m, i) => m.current_hp ?? statsB[i].hp);

  let ia = 0;
  let ib = 0;
  const log = [];
  let rounds = 0;

  while (ia < teamA.length && ib < teamB.length && rounds < 300) {
    rounds++;
    const sa = statsA[ia];
    const sb = statsB[ib];

    const multA = Math.max(...sa.species.types.map((t) => effectiveness(t, sb.species.types)));
    const dmgA = Math.max(1, Math.round(sa.atk * 0.35 * (multA || 0.25) * (0.85 + Math.random() * 0.3)));
    hpB[ib] -= dmgA;
    log.push(`${sa.species.name} inflige **${dmgA}** à ${sb.species.name}`);

    if (hpB[ib] <= 0) {
      log.push(`💥 ${sb.species.name} est mis K.O. !`);
      ib++;
      continue;
    }

    const multB = Math.max(...sb.species.types.map((t) => effectiveness(t, sa.species.types)));
    const dmgB = Math.max(1, Math.round(sb.atk * 0.35 * (multB || 0.25) * (0.85 + Math.random() * 0.3)));
    hpA[ia] -= dmgB;
    log.push(`${sb.species.name} inflige **${dmgB}** à ${sa.species.name}`);

    if (hpA[ia] <= 0) {
      log.push(`💥 ${sa.species.name} est mis K.O. !`);
      ia++;
    }
  }

  const winner = ia >= teamA.length ? 'b' : 'a';
  return { winner, log: log.slice(-8), finalHpA: hpA, finalHpB: hpB };
}

// Applique un gain d'XP et gère l'évolution. Renvoie { leveled, evolvedTo } ou null.
export function applyXp(db, mon, amount) {
  const species = getSpecies(mon.species_id);
  let level = mon.level;
  let xp = mon.xp + amount;
  let leveled = false;
  while (level < 100 && xp >= xpForNext(level)) {
    xp -= xpForNext(level);
    level++;
    leveled = true;
  }

  let evolvedTo = null;
  let speciesId = mon.species_id;
  if (species.evolvesTo && species.evolveLevel && level >= species.evolveLevel) {
    speciesId = species.evolvesTo;
    evolvedTo = getSpecies(speciesId);
  }

  db.prepare('UPDATE user_pokemon SET level = ?, xp = ?, species_id = ? WHERE id = ?')
    .run(level, xp, speciesId, mon.id);

  return leveled || evolvedTo ? { leveled, evolvedTo, level } : null;
}
