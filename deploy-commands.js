import 'dotenv/config';
import { REST, Routes, Collection } from 'discord.js';
import { loadCommands } from './src/handlers/commandHandler.js';

const client = { commands: new Collection() };
await loadCommands(client);

const commands = client.commands.map((c) => c.data.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log(`Déploiement de ${commands.length} commande(s)...`);

  if (process.env.GUILD_ID) {
    // Déploiement sur un serveur précis = instantané (idéal pour le dev)
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log(`✅ Commandes déployées sur le serveur ${process.env.GUILD_ID}.`);
  } else {
    // Déploiement global = peut prendre jusqu'à 1h à se propager
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Commandes déployées globalement.');
  }
import 'dotenv/config';
import { REST, Routes, Collection } from 'discord.js';
import { loadCommands } from './src/handlers/commandHandler.js';

const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];

for (const variable of required) {
  if (!process.env[variable]) {
    console.error(`❌ Variable d'environnement manquante : ${variable}`);
    process.exit(1);
  }
}

const client = { commands: new Collection() };

await loadCommands(client);

const commands = client.commands.map((c) => c.data.toJSON());

console.log(`📦 ${commands.length} commande(s) chargée(s).`);

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log('🚀 Déploiement des commandes...');

  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    {
      body: commands,
    }
  );

  console.log(
    `✅ ${commands.length} commande(s) déployée(s) sur le serveur ${process.env.GUILD_ID}.`
  );
} catch (error) {
  console.error('❌ Échec du déploiement des commandes :');
  console.error(error);
  process.exit(1);
}
