// Suivi des invitations : on garde en mémoire le nombre d'utilisations de
// chaque invitation par serveur, et on compare avant/après chaque arrivée
// pour deviner qui a invité qui. Nécessite que le bot ait la permission
// « Gérer le serveur » pour lire la liste des invitations.

const inviteCache = new Map(); // guildId -> Map(code -> uses)

// À appeler au démarrage (et quand le bot rejoint un nouveau serveur)
export async function primeInviteCache(guild) {
  try {
    const invites = await guild.invites.fetch();
    inviteCache.set(guild.id, new Map(invites.map((i) => [i.code, i.uses])));
  } catch (err) {
    console.warn(`[invites] Impossible de charger les invitations de "${guild.name}" (permission manquante ?) :`, err.message);
  }
}

// À appeler quand un membre rejoint : renvoie l'ID de l'inviteur, ou null si indéterminé
// (URL vanity, Discovery, ou permission manquante).
export async function resolveInviter(guild) {
  const before = inviteCache.get(guild.id) || new Map();

  let invites;
  try {
    invites = await guild.invites.fetch();
  } catch {
    return null;
  }

  const after = new Map(invites.map((i) => [i.code, i.uses]));
  inviteCache.set(guild.id, after);

  for (const invite of invites.values()) {
    const beforeUses = before.get(invite.code) || 0;
    if (invite.uses > beforeUses) {
      return invite.inviter?.id || null;
    }
  }
  return null;
}
