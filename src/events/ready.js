import { Events, ActivityType } from 'discord.js';
import { startScheduler } from '../utils/scheduler.js';
import { primeInviteCache } from '../utils/inviteTracker.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
    console.log(`   Sur ${client.guilds.cache.size} serveur(s).`);
    client.user.setActivity('tout regrouper | /help', { type: ActivityType.Playing });
    startScheduler(client);

    // Amorce le cache des invitations pour le suivi (qui a invité qui)
    for (const guild of client.guilds.cache.values()) {
      await primeInviteCache(guild);
    }
  },
};
