// Télécharge le Pokédex national complet (par défaut 1025 Pokémon) depuis
// PokéAPI (https://pokeapi.co — API publique et gratuite, aucune clé requise)
// et génère src/data/pokedex-full.json.
//
// À lancer UNE FOIS, avec une connexion Internet :
//   npm run fetch-pokedex
//   npm run fetch-pokedex -- 251     (pour s'arrêter à la Gen 2, par ex.)
//
// Une fois le fichier généré, src/data/pokedex.js le charge automatiquement
// au démarrage du bot — plus besoin de relancer ce script (sauf mise à jour).
// Durée estimée : environ 5 à 10 minutes pour les 1025 (dépend du réseau).

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'src', 'data', 'pokedex-full.json');

const TOTAL = parseInt(process.argv[2] || '1025', 10);
const CONCURRENCY = 8;
const API = 'https://pokeapi.co/api/v2';

const SPECIAL_NAMES = {
  'nidoran-f': 'Nidoran♀', 'nidoran-m': 'Nidoran♂', 'mr-mime': 'Mr. Mime',
  'mime-jr': 'Mime Jr.', 'ho-oh': 'Ho-Oh', 'porygon-z': 'Porygon-Z',
  'type-null': 'Type: Null', 'jangmo-o': 'Jangmo-o', 'hakamo-o': 'Hakamo-o',
  'kommo-o': 'Kommo-o', 'tapu-koko': 'Tapu Koko', 'tapu-lele': 'Tapu Lele',
  'tapu-bulu': 'Tapu Bulu', 'tapu-fini': 'Tapu Fini',
};

function prettyName(apiName) {
  if (SPECIAL_NAMES[apiName]) return SPECIAL_NAMES[apiName];
  return apiName.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchJson(url, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries) throw err;
      await sleep(400 * (i + 1));
    }
  }
}

// Exécute des tâches avec une limite de requêtes simultanées
async function pool(items, limit, worker) {
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}

// Parcourt récursivement une chaîne d'évolution PokéAPI et remplit evoMap
// evoMap est indexé par le nom API brut (ex: "bulbasaur"), pas le nom affiché.
function walkChain(node, evoMap) {
  for (const next of node.evolves_to || []) {
    const detail = next.evolution_details?.[0];
    // Pour les évolutions par pierre / échange / bonheur (pas de min_level),
    // on utilise un niveau approximatif pour rester jouable "par niveau".
    const level = detail?.min_level || 32;
    evoMap.set(node.species.name, { to: next.species.name, level });
    walkChain(next, evoMap);
  }
}

async function main() {
  console.log(`📡 Téléchargement du Pokédex (#1 à #${TOTAL}) depuis PokéAPI...`);
  const ids = Array.from({ length: TOTAL }, (_, i) => i + 1);
  const entries = new Array(TOTAL);

  // ---- Étape 1 : espèce + types pour chaque ID ----
  let done = 0;
  await pool(ids, CONCURRENCY, async (id) => {
    try {
      const [species, mon] = await Promise.all([
        fetchJson(`${API}/pokemon-species/${id}`),
        fetchJson(`${API}/pokemon/${id}`),
      ]);

      const nameFr = species.names?.find((n) => n.language.name === 'fr')?.name || null;
      const chainUrl = species.evolution_chain?.url;
      const chainMatch = chainUrl?.match(/evolution-chain\/(\d+)/);

      entries[id - 1] = {
        id,
        apiName: species.name, // nom brut, utilisé uniquement pour relier les évolutions
        name: prettyName(species.name),
        nameFr,
        types: mon.types.map((t) => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)),
        legendary: Boolean(species.is_legendary || species.is_mythical),
        chainId: chainMatch ? parseInt(chainMatch[1], 10) : null,
      };
    } catch (err) {
      console.warn(`⚠️  #${id} échoué (${err.message}), entrée de secours utilisée.`);
      entries[id - 1] = { id, apiName: `pokemon-${id}`, name: `Pokemon${id}`, nameFr: null, types: ['Normal'], legendary: false, chainId: null };
    }
    done++;
    if (done % 50 === 0) console.log(`   ${done}/${TOTAL}...`);
  });

  // ---- Étape 2 : chaînes d'évolution (dédupliquées) ----
  const chainIds = [...new Set(entries.map((e) => e.chainId).filter(Boolean))];
  console.log(`📡 Téléchargement de ${chainIds.length} chaînes d'évolution...`);
  const evoMap = new Map(); // apiName -> { to: apiName, level }

  let doneChains = 0;
  await pool(chainIds, CONCURRENCY, async (chainId) => {
    try {
      const chain = await fetchJson(`${API}/evolution-chain/${chainId}`);
      walkChain(chain.chain, evoMap);
    } catch (err) {
      console.warn(`⚠️  chaîne #${chainId} échouée (${err.message}).`);
    }
    doneChains++;
    if (doneChains % 100 === 0) console.log(`   ${doneChains}/${chainIds.length}...`);
  });

  // ---- Étape 3 : fusion evolvesTo/evolveLevel dans les entrées ----
  const idByApiName = new Map(entries.map((e) => [e.apiName, e.id]));
  for (const e of entries) {
    const evo = evoMap.get(e.apiName);
    if (evo && idByApiName.has(evo.to)) {
      e.evolvesTo = idByApiName.get(evo.to);
      e.evolveLevel = evo.level;
    } else {
      e.evolvesTo = null;
      e.evolveLevel = null;
    }
    delete e.apiName;
    delete e.chainId;
  }

  writeFileSync(OUT_PATH, JSON.stringify(entries), 'utf-8');
  console.log(`✅ Pokédex complet enregistré : ${OUT_PATH} (${entries.length} entrées)`);
  console.log('   Redémarre le bot pour que les changements prennent effet.');
}

main().catch((err) => { console.error('❌ Échec du téléchargement :', err); process.exit(1); });
