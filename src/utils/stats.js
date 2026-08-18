// Calcule la valeur d'une statistique de serveur
export function computeStat(guild, type) {
  switch (type) {
    case 'members': return guild.memberCount;
    case 'bots': return guild.members.cache.filter((m) => m.user.bot).size;
    case 'humans': return guild.memberCount - guild.members.cache.filter((m) => m.user.bot).size;
    case 'boosts': return guild.premiumSubscriptionCount || 0;
    default: return 0;
  }
}
