import { embed, COLORS, sendLog } from './helpers.js';

// Mémoire volatile des arrivées récentes par serveur
const joinMap = new Map();
let lockdownUntil = new Map();

// Renvoie true si le membre a été expulsé (compte trop récent)
export async function runAntiRaid(member, cfg) {
  if (!cfg.antiraid_enabled) return false;

  const now = Date.now();

  // --- Filtre de compte récent ---
  if (cfg.min_account_age > 0) {
    const ageMs = now - member.user.createdTimestamp;
    const minMs = cfg.min_account_age * 24 * 60 * 60 * 1000;
    if (ageMs < minMs) {
      await member.send({ embeds: [embed({
        title: `🛡️ ${member.guild.name}`,
        description: `Ton compte est trop récent pour rejoindre ce serveur (minimum ${cfg.min_account_age} jour(s)).`,
        color: COLORS.error,
      })] }).catch(() => {});
      await member.kick('Anti-raid : compte trop récent').catch(() => {});
      await sendLog(member.guild, {
        title: '🛡️ Anti-raid — compte récent',
        description: `${member.user.tag} expulsé (compte créé <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>).`,
        color: COLORS.warn,
      });
      return true;
    }
  }

  // --- Détection de vague d'arrivées ---
  if (cfg.raid_threshold > 0) {
    const windowMs = (cfg.raid_window || 10) * 1000;
    const key = member.guild.id;
    const joins = (joinMap.get(key) || []).filter((t) => now - t < windowMs);
    joins.push(now);
    joinMap.set(key, joins);

    if (joins.length >= cfg.raid_threshold) {
      const last = lockdownUntil.get(key) || 0;
      if (now > last) {
        lockdownUntil.set(key, now + 60_000); // évite le spam d'alertes (1/min)
        await sendLog(member.guild, {
          title: '🚨 ALERTE RAID',
          description: `**${joins.length} arrivées** en moins de ${cfg.raid_window}s détectées ! Vérifiez le serveur.`,
          color: COLORS.error,
        });
      }
    }
  }

  return false;
}
