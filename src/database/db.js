import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'bot.db'));

db.pragma('journal_mode = WAL');

// ---- Configuration par serveur ----
db.exec(`
CREATE TABLE IF NOT EXISTS guild_config (
  guild_id TEXT PRIMARY KEY,
  welcome_channel TEXT,
  welcome_message TEXT,
  leave_channel TEXT,
  leave_message TEXT,
  log_channel TEXT,
  level_channel TEXT,
  level_up_message TEXT,
  autorole TEXT,
  automod_spam INTEGER DEFAULT 0,
  automod_invites INTEGER DEFAULT 0,
  automod_badwords INTEGER DEFAULT 0,
  badwords TEXT DEFAULT '',
  suggestion_channel TEXT,
  starboard_channel TEXT,
  star_threshold INTEGER DEFAULT 3,
  antiraid_enabled INTEGER DEFAULT 0,
  min_account_age INTEGER DEFAULT 0,
  raid_threshold INTEGER DEFAULT 0,
  raid_window INTEGER DEFAULT 10
);
`);

// Migration : ajoute les colonnes manquantes aux bases déjà existantes
function ensureColumns(table, columns) {
  const existing = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  for (const [name, def] of Object.entries(columns)) {
    if (!existing.includes(name)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
    }
  }
}
ensureColumns('guild_config', {
  suggestion_channel: 'TEXT',
  starboard_channel: 'TEXT',
  star_threshold: 'INTEGER DEFAULT 3',
  antiraid_enabled: 'INTEGER DEFAULT 0',
  min_account_age: 'INTEGER DEFAULT 0',
  raid_threshold: 'INTEGER DEFAULT 0',
  raid_window: 'INTEGER DEFAULT 10',
  tempvoice_hub: 'TEXT',
  tempvoice_category: 'TEXT',
  verify_role: 'TEXT',
  birthday_channel: 'TEXT',
  pokemon_channel: 'TEXT',
  warn_threshold: 'INTEGER DEFAULT 0',
  warn_timeout_minutes: 'INTEGER DEFAULT 60',
});

// ---- Niveaux / XP ----
db.exec(`
CREATE TABLE IF NOT EXISTS levels (
  guild_id TEXT,
  user_id TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0,
  last_message INTEGER DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);
`);

// ---- Avertissements ----
db.exec(`
CREATE TABLE IF NOT EXISTS warnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  user_id TEXT,
  moderator_id TEXT,
  reason TEXT,
  timestamp INTEGER
);
`);

// ---- Économie ----
db.exec(`
CREATE TABLE IF NOT EXISTS economy (
  guild_id TEXT,
  user_id TEXT,
  wallet INTEGER DEFAULT 0,
  bank INTEGER DEFAULT 0,
  last_daily INTEGER DEFAULT 0,
  last_work INTEGER DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);
`);

// ---- Rôles-boutons ----
db.exec(`
CREATE TABLE IF NOT EXISTS reaction_roles (
  custom_id TEXT PRIMARY KEY,
  guild_id TEXT,
  message_id TEXT,
  role_id TEXT,
  label TEXT
);
`);

// ---- Tickets ----
db.exec(`
CREATE TABLE IF NOT EXISTS ticket_config (
  guild_id TEXT PRIMARY KEY,
  category_id TEXT,
  support_role TEXT,
  log_channel TEXT
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS tickets (
  channel_id TEXT PRIMARY KEY,
  guild_id TEXT,
  user_id TEXT,
  status TEXT DEFAULT 'open',
  created_at INTEGER
);
`);

// ---- Giveaways ----
db.exec(`
CREATE TABLE IF NOT EXISTS giveaways (
  message_id TEXT PRIMARY KEY,
  guild_id TEXT,
  channel_id TEXT,
  prize TEXT,
  winners_count INTEGER,
  host_id TEXT,
  end_at INTEGER,
  ended INTEGER DEFAULT 0
);
`);
db.exec(`
CREATE TABLE IF NOT EXISTS giveaway_entries (
  message_id TEXT,
  user_id TEXT,
  PRIMARY KEY (message_id, user_id)
);
`);

// ---- Suggestions ----
db.exec(`
CREATE TABLE IF NOT EXISTS suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  channel_id TEXT,
  message_id TEXT,
  author_id TEXT,
  content TEXT,
  status TEXT DEFAULT 'pending',
  created_at INTEGER
);
`);
db.exec(`
CREATE TABLE IF NOT EXISTS suggestion_votes (
  suggestion_id INTEGER,
  user_id TEXT,
  value INTEGER,
  PRIMARY KEY (suggestion_id, user_id)
);
`);

// ---- Starboard ----
db.exec(`
CREATE TABLE IF NOT EXISTS starboard (
  original_id TEXT PRIMARY KEY,
  guild_id TEXT,
  starboard_id TEXT
);
`);

// ---- Rappels ----
db.exec(`
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  channel_id TEXT,
  guild_id TEXT,
  remind_at INTEGER,
  content TEXT
);
`);

// ---- Tags (réponses enregistrées) ----
db.exec(`
CREATE TABLE IF NOT EXISTS tags (
  guild_id TEXT,
  name TEXT,
  content TEXT,
  author_id TEXT,
  uses INTEGER DEFAULT 0,
  PRIMARY KEY (guild_id, name)
);
`);

// ---- Auto-responders ----
db.exec(`
CREATE TABLE IF NOT EXISTS autoresponders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  trigger TEXT,
  response TEXT,
  match_type TEXT DEFAULT 'contains'
);
`);

// ---- Historique de modération ----
db.exec(`
CREATE TABLE IF NOT EXISTS modlog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  user_id TEXT,
  moderator_id TEXT,
  action TEXT,
  reason TEXT,
  timestamp INTEGER
);
`);

// ---- AFK ----
db.exec(`
CREATE TABLE IF NOT EXISTS afk (
  guild_id TEXT,
  user_id TEXT,
  reason TEXT,
  since INTEGER,
  PRIMARY KEY (guild_id, user_id)
);
`);

// ---- Salons vocaux temporaires ----
db.exec(`
CREATE TABLE IF NOT EXISTS temp_channels (
  channel_id TEXT PRIMARY KEY,
  guild_id TEXT,
  owner_id TEXT
);
`);

// ---- Récompenses de rôles par niveau ----
db.exec(`
CREATE TABLE IF NOT EXISTS level_rewards (
  guild_id TEXT,
  level INTEGER,
  role_id TEXT,
  PRIMARY KEY (guild_id, level)
);
`);

// ---- Anniversaires ----
db.exec(`
CREATE TABLE IF NOT EXISTS birthdays (
  guild_id TEXT,
  user_id TEXT,
  day INTEGER,
  month INTEGER,
  last_announced INTEGER DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);
`);

// ---- Menus de rôles (select) ----
db.exec(`
CREATE TABLE IF NOT EXISTS role_menus (
  message_id TEXT PRIMARY KEY,
  guild_id TEXT,
  role_ids TEXT
);
`);

// ---- Salons-compteurs (stats) ----
db.exec(`
CREATE TABLE IF NOT EXISTS stats_channels (
  channel_id TEXT PRIMARY KEY,
  guild_id TEXT,
  type TEXT,
  template TEXT
);
`);

// Migration : claim de ticket
ensureColumns('tickets', { claimed_by: 'TEXT' });

// ---- Pokémon : spawns sauvages actifs (un par salon) ----
db.exec(`
CREATE TABLE IF NOT EXISTS pokemon_spawns (
  channel_id TEXT PRIMARY KEY,
  guild_id TEXT,
  species_id INTEGER,
  shiny INTEGER DEFAULT 0,
  message_id TEXT,
  spawned_at INTEGER
);
`);

// ---- Pokémon capturés ----
db.exec(`
CREATE TABLE IF NOT EXISTS user_pokemon (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  user_id TEXT,
  species_id INTEGER,
  nickname TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  iv INTEGER DEFAULT 0,
  shiny INTEGER DEFAULT 0,
  selected INTEGER DEFAULT 0,
  caught_at INTEGER
);
`);

// Migration : équipe de combat (1-6) + PV persistants entre les combats
ensureColumns('user_pokemon', { team_slot: 'INTEGER DEFAULT 0', current_hp: 'INTEGER' });

// ---- Inventaire d'objets Pokémon ----
db.exec(`
CREATE TABLE IF NOT EXISTS user_items (
  guild_id TEXT,
  user_id TEXT,
  item_id TEXT,
  quantity INTEGER DEFAULT 0,
  PRIMARY KEY (guild_id, user_id, item_id)
);
`);

// ---- Échanges de Pokémon ----
db.exec(`
CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  from_user TEXT,
  to_user TEXT,
  from_pokemon_id INTEGER,
  to_pokemon_id INTEGER,
  status TEXT DEFAULT 'pending',
  created_at INTEGER
);
`);

// ---- Playlists musicales sauvegardées ----
db.exec(`
CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  user_id TEXT,
  name TEXT,
  tracks TEXT DEFAULT '[]',
  created_at INTEGER,
  UNIQUE(guild_id, user_id, name)
);
`);

// ---- Suivi des invitations ----
db.exec(`
CREATE TABLE IF NOT EXISTS invite_tracking (
  guild_id TEXT,
  user_id TEXT,
  inviter_id TEXT,
  joined_at INTEGER,
  PRIMARY KEY (guild_id, user_id)
);
`);

// ---------- Helpers ----------

export function getGuildConfig(guildId) {
  let row = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  if (!row) {
    db.prepare('INSERT INTO guild_config (guild_id) VALUES (?)').run(guildId);
    row = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  }
  return row;
}

export function setGuildConfig(guildId, field, value) {
  getGuildConfig(guildId); // garantit l'existence de la ligne
  const allowed = [
    'welcome_channel', 'welcome_message', 'leave_channel', 'leave_message',
    'log_channel', 'level_channel', 'level_up_message', 'autorole',
    'automod_spam', 'automod_invites', 'automod_badwords', 'badwords',
    'suggestion_channel', 'starboard_channel', 'star_threshold',
    'antiraid_enabled', 'min_account_age', 'raid_threshold', 'raid_window',
    'tempvoice_hub', 'tempvoice_category', 'verify_role', 'birthday_channel', 'pokemon_channel',
    'warn_threshold', 'warn_timeout_minutes'
  ];
  if (!allowed.includes(field)) throw new Error(`Champ interdit: ${field}`);
  db.prepare(`UPDATE guild_config SET ${field} = ? WHERE guild_id = ?`).run(value, guildId);
}

export default db;
