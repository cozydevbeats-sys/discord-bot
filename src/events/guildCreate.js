import { Events } from 'discord.js';
import { primeInviteCache } from '../utils/inviteTracker.js';

export default {
  name: Events.GuildCreate,
  async execute(guild) {
    console.log(`[serveur] Rejoint : ${guild.name} (${guild.id})`);
    await primeInviteCache(guild);
  },
};
