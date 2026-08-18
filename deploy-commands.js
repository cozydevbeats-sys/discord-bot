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
      `✅ Commandes déployées sur le serveur ${process.env.GUILD_ID}.`
    );
  } else {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      {
        body: commands,
      }
    );

    console.log('✅ Commandes déployées globalement.');
  }
} catch (error) {
  console.error('❌ Erreur lors du déploiement des commandes :');
  console.error(error);
  process.exit(1);
}