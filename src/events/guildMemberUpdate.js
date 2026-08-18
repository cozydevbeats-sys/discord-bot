import { Events } from 'discord.js';
import { sendLog, COLORS } from '../utils/helpers.js';

export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    if (newMember.user.bot) return;

    // Changement de pseudo
    if (oldMember.nickname !== newMember.nickname) {
      const before = oldMember.nickname || oldMember.user.username;
      const after = newMember.nickname || newMember.user.username;
      await sendLog(newMember.guild, {
        title: '✏️ Pseudo modifié',
        description: `${newMember} : \`${before}\` → \`${after}\``,
        color: COLORS.info,
      });
    }

    // Rôles ajoutés/retirés
    const addedRoles = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);
    const removedRoles = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);

    if (addedRoles.size > 0 || removedRoles.size > 0) {
      const parts = [];
      if (addedRoles.size) parts.push(`➕ ${addedRoles.map((r) => r.name).join(', ')}`);
      if (removedRoles.size) parts.push(`➖ ${removedRoles.map((r) => r.name).join(', ')}`);
      await sendLog(newMember.guild, {
        title: '🎭 Rôles modifiés',
        description: `${newMember} : ${parts.join(' · ')}`,
        color: COLORS.info,
      });
    }
  },
};
