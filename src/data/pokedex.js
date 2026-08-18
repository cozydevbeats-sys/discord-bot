import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FULL_DEX_PATH = join(__dirname, 'pokedex-full.json');

// ================= Pokédex Génération 1 (secours intégré, 151) =================
// Utilisé tant que le Pokédex complet (1025) n'a pas été téléchargé via
// `npm run fetch-pokedex` (voir scripts/fetch-pokedex.js — nécessite Internet).
// Une fois le fichier src/data/pokedex-full.json généré, il prend le relais
// automatiquement et ce tableau n'est plus utilisé.
// Format : [id, nom, [types], évolueVers(id|0), niveauÉvolution(0|n)]
const GEN1_RAW = [
  [1, 'Bulbasaur', ['Grass', 'Poison'], 2, 16], [2, 'Ivysaur', ['Grass', 'Poison'], 3, 32], [3, 'Venusaur', ['Grass', 'Poison'], 0, 0],
  [4, 'Charmander', ['Fire'], 5, 16], [5, 'Charmeleon', ['Fire'], 6, 36], [6, 'Charizard', ['Fire', 'Flying'], 0, 0],
  [7, 'Squirtle', ['Water'], 8, 16], [8, 'Wartortle', ['Water'], 9, 36], [9, 'Blastoise', ['Water'], 0, 0],
  [10, 'Caterpie', ['Bug'], 11, 7], [11, 'Metapod', ['Bug'], 12, 10], [12, 'Butterfree', ['Bug', 'Flying'], 0, 0],
  [13, 'Weedle', ['Bug', 'Poison'], 14, 7], [14, 'Kakuna', ['Bug', 'Poison'], 15, 10], [15, 'Beedrill', ['Bug', 'Poison'], 0, 0],
  [16, 'Pidgey', ['Normal', 'Flying'], 17, 18], [17, 'Pidgeotto', ['Normal', 'Flying'], 18, 36], [18, 'Pidgeot', ['Normal', 'Flying'], 0, 0],
  [19, 'Rattata', ['Normal'], 20, 20], [20, 'Raticate', ['Normal'], 0, 0],
  [21, 'Spearow', ['Normal', 'Flying'], 22, 20], [22, 'Fearow', ['Normal', 'Flying'], 0, 0],
  [23, 'Ekans', ['Poison'], 24, 22], [24, 'Arbok', ['Poison'], 0, 0],
  [25, 'Pikachu', ['Electric'], 26, 30], [26, 'Raichu', ['Electric'], 0, 0],
  [27, 'Sandshrew', ['Ground'], 28, 22], [28, 'Sandslash', ['Ground'], 0, 0],
  [29, 'Nidoran♀', ['Poison'], 30, 16], [30, 'Nidorina', ['Poison'], 31, 30], [31, 'Nidoqueen', ['Poison', 'Ground'], 0, 0],
  [32, 'Nidoran♂', ['Poison'], 33, 16], [33, 'Nidorino', ['Poison'], 34, 30], [34, 'Nidoking', ['Poison', 'Ground'], 0, 0],
  [35, 'Clefairy', ['Normal'], 36, 30], [36, 'Clefable', ['Normal'], 0, 0],
  [37, 'Vulpix', ['Fire'], 38, 30], [38, 'Ninetales', ['Fire'], 0, 0],
  [39, 'Jigglypuff', ['Normal'], 40, 30], [40, 'Wigglytuff', ['Normal'], 0, 0],
  [41, 'Zubat', ['Poison', 'Flying'], 42, 22], [42, 'Golbat', ['Poison', 'Flying'], 0, 0],
  [43, 'Oddish', ['Grass', 'Poison'], 44, 21], [44, 'Gloom', ['Grass', 'Poison'], 45, 30], [45, 'Vileplume', ['Grass', 'Poison'], 0, 0],
  [46, 'Paras', ['Bug', 'Grass'], 47, 24], [47, 'Parasect', ['Bug', 'Grass'], 0, 0],
  [48, 'Venonat', ['Bug', 'Poison'], 49, 31], [49, 'Venomoth', ['Bug', 'Poison'], 0, 0],
  [50, 'Diglett', ['Ground'], 51, 26], [51, 'Dugtrio', ['Ground'], 0, 0],
  [52, 'Meowth', ['Normal'], 53, 28], [53, 'Persian', ['Normal'], 0, 0],
  [54, 'Psyduck', ['Water'], 55, 33], [55, 'Golduck', ['Water'], 0, 0],
  [56, 'Mankey', ['Fighting'], 57, 28], [57, 'Primeape', ['Fighting'], 0, 0],
  [58, 'Growlithe', ['Fire'], 59, 30], [59, 'Arcanine', ['Fire'], 0, 0],
  [60, 'Poliwag', ['Water'], 61, 25], [61, 'Poliwhirl', ['Water'], 62, 30], [62, 'Poliwrath', ['Water', 'Fighting'], 0, 0],
  [63, 'Abra', ['Psychic'], 64, 16], [64, 'Kadabra', ['Psychic'], 65, 30], [65, 'Alakazam', ['Psychic'], 0, 0],
  [66, 'Machop', ['Fighting'], 67, 28], [67, 'Machoke', ['Fighting'], 68, 30], [68, 'Machamp', ['Fighting'], 0, 0],
  [69, 'Bellsprout', ['Grass', 'Poison'], 70, 21], [70, 'Weepinbell', ['Grass', 'Poison'], 71, 30], [71, 'Victreebel', ['Grass', 'Poison'], 0, 0],
  [72, 'Tentacool', ['Water', 'Poison'], 73, 30], [73, 'Tentacruel', ['Water', 'Poison'], 0, 0],
  [74, 'Geodude', ['Rock', 'Ground'], 75, 25], [75, 'Graveler', ['Rock', 'Ground'], 76, 30], [76, 'Golem', ['Rock', 'Ground'], 0, 0],
  [77, 'Ponyta', ['Fire'], 78, 40], [78, 'Rapidash', ['Fire'], 0, 0],
  [79, 'Slowpoke', ['Water', 'Psychic'], 80, 37], [80, 'Slowbro', ['Water', 'Psychic'], 0, 0],
  [81, 'Magnemite', ['Electric'], 82, 30], [82, 'Magneton', ['Electric'], 0, 0],
  [83, 'Farfetch\'d', ['Normal', 'Flying'], 0, 0],
  [84, 'Doduo', ['Normal', 'Flying'], 85, 31], [85, 'Dodrio', ['Normal', 'Flying'], 0, 0],
  [86, 'Seel', ['Water'], 87, 34], [87, 'Dewgong', ['Water', 'Ice'], 0, 0],
  [88, 'Grimer', ['Poison'], 89, 38], [89, 'Muk', ['Poison'], 0, 0],
  [90, 'Shellder', ['Water'], 91, 30], [91, 'Cloyster', ['Water', 'Ice'], 0, 0],
  [92, 'Gastly', ['Ghost', 'Poison'], 93, 25], [93, 'Haunter', ['Ghost', 'Poison'], 94, 30], [94, 'Gengar', ['Ghost', 'Poison'], 0, 0],
  [95, 'Onix', ['Rock', 'Ground'], 0, 0],
  [96, 'Drowzee', ['Psychic'], 97, 26], [97, 'Hypno', ['Psychic'], 0, 0],
  [98, 'Krabby', ['Water'], 99, 28], [99, 'Kingler', ['Water'], 0, 0],
  [100, 'Voltorb', ['Electric'], 101, 30], [101, 'Electrode', ['Electric'], 0, 0],
  [102, 'Exeggcute', ['Grass', 'Psychic'], 103, 30], [103, 'Exeggutor', ['Grass', 'Psychic'], 0, 0],
  [104, 'Cubone', ['Ground'], 105, 28], [105, 'Marowak', ['Ground'], 0, 0],
  [106, 'Hitmonlee', ['Fighting'], 0, 0], [107, 'Hitmonchan', ['Fighting'], 0, 0],
  [108, 'Lickitung', ['Normal'], 0, 0],
  [109, 'Koffing', ['Poison'], 110, 35], [110, 'Weezing', ['Poison'], 0, 0],
  [111, 'Rhyhorn', ['Ground', 'Rock'], 112, 42], [112, 'Rhydon', ['Ground', 'Rock'], 0, 0],
  [113, 'Chansey', ['Normal'], 0, 0], [114, 'Tangela', ['Grass'], 0, 0], [115, 'Kangaskhan', ['Normal'], 0, 0],
  [116, 'Horsea', ['Water'], 117, 32], [117, 'Seadra', ['Water'], 0, 0],
  [118, 'Goldeen', ['Water'], 119, 33], [119, 'Seaking', ['Water'], 0, 0],
  [120, 'Staryu', ['Water'], 121, 30], [121, 'Starmie', ['Water', 'Psychic'], 0, 0],
  [122, 'Mr. Mime', ['Psychic'], 0, 0], [123, 'Scyther', ['Bug', 'Flying'], 0, 0],
  [124, 'Jynx', ['Ice', 'Psychic'], 0, 0], [125, 'Electabuzz', ['Electric'], 0, 0], [126, 'Magmar', ['Fire'], 0, 0],
  [127, 'Pinsir', ['Bug'], 0, 0], [128, 'Tauros', ['Normal'], 0, 0],
  [129, 'Magikarp', ['Water'], 130, 20], [130, 'Gyarados', ['Water', 'Flying'], 0, 0],
  [131, 'Lapras', ['Water', 'Ice'], 0, 0], [132, 'Ditto', ['Normal'], 0, 0],
  [133, 'Eevee', ['Normal'], 134, 30], [134, 'Vaporeon', ['Water'], 0, 0], [135, 'Jolteon', ['Electric'], 0, 0], [136, 'Flareon', ['Fire'], 0, 0],
  [137, 'Porygon', ['Normal'], 0, 0],
  [138, 'Omanyte', ['Rock', 'Water'], 139, 40], [139, 'Omastar', ['Rock', 'Water'], 0, 0],
  [140, 'Kabuto', ['Rock', 'Water'], 141, 40], [141, 'Kabutops', ['Rock', 'Water'], 0, 0],
  [142, 'Aerodactyl', ['Rock', 'Flying'], 0, 0], [143, 'Snorlax', ['Normal'], 0, 0],
  [144, 'Articuno', ['Ice', 'Flying'], 0, 0], [145, 'Zapdos', ['Electric', 'Flying'], 0, 0], [146, 'Moltres', ['Fire', 'Flying'], 0, 0],
  [147, 'Dratini', ['Dragon'], 148, 30], [148, 'Dragonair', ['Dragon'], 149, 55], [149, 'Dragonite', ['Dragon', 'Flying'], 0, 0],
  [150, 'Mewtwo', ['Psychic'], 0, 0], [151, 'Mew', ['Psychic'], 0, 0],
];
const GEN1_LEGENDARY = new Set([144, 145, 146, 150, 151]);

function buildGen1() {
  return GEN1_RAW.map(([id, name, types, evolvesTo, evolveLevel]) => ({
    id, name, nameFr: null, types, evolvesTo: evolvesTo || null, evolveLevel: evolveLevel || null,
    legendary: GEN1_LEGENDARY.has(id),
  }));
}

// ================= Chargement : Pokédex complet si dispo, sinon Gen 1 =================
function loadRawDex() {
  if (existsSync(FULL_DEX_PATH)) {
    try {
      const data = JSON.parse(readFileSync(FULL_DEX_PATH, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) return { list: data, full: true };
    } catch (err) {
      console.warn('[pokedex] pokedex-full.json illisible, retour au Pokédex Gen 1 intégré :', err.message);
    }
  }
  return { list: buildGen1(), full: false };
}

const { list: RAW_LIST, full: IS_FULL_DEX } = loadRawDex();

// Normalise un nom pour la comparaison (minuscules, sans accents/symboles)
export function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

// Calcule la rareté à partir de la structure des évolutions + du drapeau légendaire
function computeRarity(entry, hasPreEvoSet) {
  if (entry.legendary) return 'legendary';
  const hasPreEvo = hasPreEvoSet.has(entry.id);
  const evolves = !!entry.evolvesTo;
  if (hasPreEvo && !evolves) return 'rare';       // évolution finale
  if (hasPreEvo && evolves) return 'uncommon';    // évolution intermédiaire
  if (!hasPreEvo && evolves) return 'common';     // base d'une lignée
  return 'uncommon';                               // sans évolution
}

const hasPreEvo = new Set(RAW_LIST.filter((e) => e.evolvesTo).map((e) => e.evolvesTo));

export const POKEDEX = RAW_LIST.map((entry) => ({
  id: entry.id,
  name: entry.name,
  types: entry.types,
  evolvesTo: entry.evolvesTo || null,
  evolveLevel: entry.evolveLevel || null,
  rarity: computeRarity(entry, hasPreEvo),
  accepted: [entry.name, entry.nameFr].filter(Boolean).map(normalize),
}));

const BY_ID = new Map(POKEDEX.map((p) => [p.id, p]));
export const getSpecies = (id) => BY_ID.get(id);

// Trouve une espèce à partir d'un nom deviné (FR ou EN, insensible aux accents/casse)
export function findSpeciesByGuess(guess) {
  const norm = normalize(guess);
  if (!norm) return null;
  return POKEDEX.find((p) => p.accepted.includes(norm)) || null;
}

export function spriteUrl(id, shiny = false) {
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  return shiny ? `${base}/shiny/${id}.png` : `${base}/${id}.png`;
}

export const TOTAL = POKEDEX.length;
export { IS_FULL_DEX };

console.log(`[pokedex] ${TOTAL} Pokémon chargés (${IS_FULL_DEX ? 'Pokédex national complet' : 'Gen 1 uniquement — lance "npm run fetch-pokedex" pour débloquer les 1025'}).`);

// ================= Table des types (simplifiée, à usage ludique) =================
const CHART = {
  Normal: { half: ['Rock', 'Steel'], zero: ['Ghost'] },
  Fire: { double: ['Grass', 'Ice', 'Bug', 'Steel'], half: ['Fire', 'Water', 'Rock', 'Dragon'] },
  Water: { double: ['Fire', 'Ground', 'Rock'], half: ['Water', 'Grass', 'Dragon'] },
  Electric: { double: ['Water', 'Flying'], half: ['Electric', 'Grass', 'Dragon'], zero: ['Ground'] },
  Grass: { double: ['Water', 'Ground', 'Rock'], half: ['Fire', 'Grass', 'Poison', 'Flying', 'Bug', 'Dragon', 'Steel'] },
  Ice: { double: ['Grass', 'Ground', 'Flying', 'Dragon'], half: ['Fire', 'Water', 'Ice', 'Steel'] },
  Fighting: { double: ['Normal', 'Rock', 'Ice', 'Steel', 'Dark'], half: ['Poison', 'Flying', 'Psychic', 'Bug', 'Fairy'], zero: ['Ghost'] },
  Poison: { double: ['Grass', 'Bug', 'Fairy'], half: ['Poison', 'Ground', 'Rock', 'Ghost'], zero: ['Steel'] },
  Ground: { double: ['Fire', 'Electric', 'Poison', 'Rock', 'Steel'], half: ['Grass', 'Bug'], zero: ['Flying'] },
  Flying: { double: ['Grass', 'Fighting', 'Bug'], half: ['Electric', 'Rock', 'Steel'] },
  Psychic: { double: ['Fighting', 'Poison'], half: ['Psychic', 'Steel'], zero: ['Dark'] },
  Bug: { double: ['Grass', 'Poison', 'Psychic'], half: ['Fire', 'Fighting', 'Flying', 'Ghost', 'Steel'] },
  Rock: { double: ['Fire', 'Ice', 'Flying', 'Bug'], half: ['Fighting', 'Ground', 'Steel'] },
  Ghost: { double: ['Ghost', 'Psychic'], half: ['Dark'], zero: ['Normal'] },
  Dragon: { double: ['Dragon'], half: ['Steel'], zero: ['Fairy'] },
  Dark: { double: ['Psychic', 'Ghost'], half: ['Dark', 'Fighting', 'Fairy'] },
  Steel: { double: ['Rock', 'Ice', 'Fairy'], half: ['Steel', 'Fire', 'Water', 'Electric'] },
  Fairy: { double: ['Fighting', 'Dragon', 'Dark'], half: ['Fire', 'Poison', 'Steel'] },
};

// Multiplicateur d'efficacité d'un type attaquant contre des types défenseurs
export function effectiveness(attackType, defenderTypes) {
  const rule = CHART[attackType] || {};
  let mult = 1;
  for (const t of defenderTypes) {
    if (rule.zero?.includes(t)) mult *= 0;
    else if (rule.double?.includes(t)) mult *= 2;
    else if (rule.half?.includes(t)) mult *= 0.5;
  }
  return mult;
}

// Puissance/PV de base selon la rareté
export function baseStats(species) {
  const table = {
    common: { pow: 40, hp: 45 },
    uncommon: { pow: 55, hp: 60 },
    rare: { pow: 75, hp: 80 },
    legendary: { pow: 95, hp: 100 },
  };
  return table[species.rarity];
}

export const RARITY_EMOJI = { common: '⚪', uncommon: '🟢', rare: '🔵', legendary: '🟣' };
