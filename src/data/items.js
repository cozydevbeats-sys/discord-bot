// Catalogue d'objets pour le module Pokémon.
// type: 'heal' (restaure des PV), 'levelup' (gagne un niveau), 'evolve' (force l'évolution),
// 'ball' (réduit la chance de fuite à la capture, géré directement dans catch.js).
export const ITEMS = {
  potion: {
    id: 'potion', name: 'Potion', emoji: '🧪', price: 50,
    description: 'Restaure 50 PV.', type: 'heal', amount: 50,
  },
  super_potion: {
    id: 'super_potion', name: 'Super Potion', emoji: '💊', price: 120,
    description: 'Restaure 120 PV.', type: 'heal', amount: 120,
  },
  full_restore: {
    id: 'full_restore', name: 'Guérison', emoji: '✨', price: 250,
    description: 'Restaure tous les PV.', type: 'heal', amount: Infinity,
  },
  rare_candy: {
    id: 'rare_candy', name: 'Super Bonbon', emoji: '🍬', price: 200,
    description: 'Fait gagner un niveau instantanément.', type: 'levelup',
  },
  evolution_stone: {
    id: 'evolution_stone', name: 'Pierre d\'évolution', emoji: '💎', price: 400,
    description: 'Fait évoluer un Pokémon éligible, sans condition de niveau.', type: 'evolve',
  },
  great_ball: {
    id: 'great_ball', name: 'Super Ball', emoji: '🔵', price: 100,
    description: 'Réduit de 50% la chance qu\'un Pokémon rare s\'enfuie à la capture.',
    type: 'ball', fleeReduction: 0.5,
  },
  ultra_ball: {
    id: 'ultra_ball', name: 'Hyper Ball', emoji: '🟡', price: 250,
    description: 'Réduit de 80% la chance qu\'un Pokémon rare s\'enfuie à la capture.',
    type: 'ball', fleeReduction: 0.8,
  },
};

// Chance de fuite de base selon la rareté (avant réduction éventuelle par une Ball)
export const FLEE_CHANCE = { common: 0, uncommon: 0.05, rare: 0.15, legendary: 0.3 };
