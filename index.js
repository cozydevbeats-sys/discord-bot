import 'dotenv/config';
import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials
} from 'discord.js';

import ffmpegPath from 'ffmpeg-static';
import express from 'express';

import { loadCommands } from './src/handlers/commandHandler.js';
import { loadEvents } from './src/handlers/eventHandler.js';

// @discordjs/voice a besoin de ffmpeg
process.env.FFMPEG_PATH = ffmpegPath;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ],
});

client.commands = new Collection();

// Chargement des commandes et événements
await loadCommands(client);
await loadEvents(client);

// Sécurité : erreurs non gérées
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

// Vérification du token
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN manquant.');
  process.exit(1);
}

// Quand Discord considère le bot comme connecté
client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  console.log(`   Sur ${client.guilds.cache.size} serveur(s).`);

  // Synchronisation des slash commands
  try {
    if (!process.env.GUILD_ID) {
      console.error('❌ GUILD_ID manquant dans les variables Render.');
      return;
    }

    const commands = client.commands.map(command => {
      if (!command.data) {
        console.warn('⚠️ Commande sans propriété data ignorée.');
        return null;
      }

      return command.data.toJSON();
    }).filter(Boolean);

    console.log(`🔄 Synchronisation de ${commands.length} commande(s)...`);

    await client.application.commands.set(
      commands,
      process.env.GUILD_ID
    );

    console.log(
      `✅ ${commands.length} commande(s) synchronisée(s) sur le serveur !`
    );

  } catch (error) {
    console.error('❌ Erreur synchronisation des commandes :');
    console.error(error);
  }
});

// Connexion Discord
await client.login(process.env.DISCORD_TOKEN);

// Serveur HTTP nécessaire pour Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Omnibot is online!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Serveur HTTP lancé sur le port ${PORT}`);
});import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import ffmpegPath from 'ffmpeg-static';
import { loadCommands } from './src/handlers/commandHandler.js';
import { loadEvents } from './src/handlers/eventHandler.js';

// @discordjs/voice a besoin de ffmpeg pour transcoder l'audio ; ffmpeg-static
// fournit un binaire prêt à l'emploi, donc rien à installer manuellement.
process.env.FFMPEG_PATH = ffmpegPath;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();

await loadCommands(client);
await loadEvents(client);

// Sécurité : on n'écroule pas le process sur une erreur non gérée
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN manquant. Copie .env.example en .env et remplis-le.');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);

import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Omnibot is online!");
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Serveur HTTP lancé sur le port ${PORT}`);
});
