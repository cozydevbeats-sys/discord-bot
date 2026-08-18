import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Charge récursivement tous les fichiers de commande dans src/commands
export async function loadCommands(client) {
  const commandsPath = join(__dirname, '..', 'commands');
  const categories = readdirSync(commandsPath, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  for (const category of categories) {
    const catPath = join(commandsPath, category.name);
    const files = readdirSync(catPath).filter((f) => f.endsWith('.js'));

    for (const file of files) {
      const fileUrl = pathToFileURL(join(catPath, file)).href;
      const mod = await import(fileUrl);
      const command = mod.default;

      if (command?.data && command?.execute) {
        command.category = category.name;
        client.commands.set(command.data.name, command);
      } else {
        console.warn(`[commandes] ${category.name}/${file} ignoré (data/execute manquant)`);
      }
    }
  }

  console.log(`[commandes] ${client.commands.size} commande(s) chargée(s).`);
}
