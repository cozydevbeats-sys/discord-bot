import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Charge tous les événements dans src/events
export async function loadEvents(client) {
  const eventsPath = join(__dirname, '..', 'events');
  const files = readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const fileUrl = pathToFileURL(join(eventsPath, file)).href;
    const mod = await import(fileUrl);
    const event = mod.default;
    if (!event?.name || !event?.execute) {
      console.warn(`[events] ${file} ignoré (name/execute manquant)`);
      continue;
    }
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }

  console.log(`[events] ${files.length} événement(s) chargé(s).`);
}
