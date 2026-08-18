// Garde en mémoire le dernier message supprimé par salon, pour /snipe.
// Volontairement non persisté en base : comme sur la plupart des bots,
// le "snipe" n'est censé fonctionner que peu de temps après la suppression.
const cache = new Map(); // channelId -> { content, hasAttachment, authorTag, authorAvatar, timestamp }

export function recordDeletedMessage(message) {
  cache.set(message.channel.id, {
    content: message.content || null,
    hasAttachment: message.attachments.size > 0,
    authorTag: message.author?.tag || 'Inconnu',
    authorAvatar: message.author?.displayAvatarURL?.() || null,
    timestamp: Date.now(),
  });
}

export function getSnipe(channelId) {
  return cache.get(channelId) || null;
}
