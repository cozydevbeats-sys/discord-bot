import { Events } from 'discord.js';
import db, { getGuildConfig } from '../database/db.js';
import { embed, formatMessage, COLORS } from '../utils/helpers.js';
import { runAntiRaid } from '../utils/antiraid.js';
import { resolveInviter } from '../utils/inviteTracker.js';

export default {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const cfg = getGuildConfig(member.guild.id);

    // Anti-raid en premier : si le membre est expulsé, on s'arrête
    const kicked = await runAntiRaid(member, cfg);
    if (kicked) return;

    // Suivi des invitations : on enregistre qui a invité ce membre (si déterminable)
    const inviterId = await resolveInviter(member.guild).catch(() => null);
    db.prepare(`
      INSERT INTO invite_tracking (guild_id, user_id, inviter_id, joined_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET inviter_id = excluded.inviter_id, joined_at = excluded.joined_at
    `).run(member.guild.id, member.id, inviterId, Date.now());

    // Autorole
    if (cfg.autorole) {
      const role = member.guild.roles.cache.get(cfg.autorole);
      if (role) await member.roles.add(role).catch(() => {});
    }

    // Message de bienvenue
    if (cfg.welcome_channel) {
      const channel = member.guild.channels.cache.get(cfg.welcome_channel);
      if (channel) {
        let msg = formatMessage(
          cfg.welcome_message || 'Bienvenue {user} sur **{server}** ! Tu es le {membercount}ᵉ membre. 🎉',
          { member, guild: member.guild }
        );
        if (inviterId) msg += `\nInvité par <@${inviterId}>.`;
        await channel.send({
          embeds: [embed({
            title: '👋 Nouveau membre',
            description: msg,
            color: COLORS.success,
            thumbnail: member.user.displayAvatarURL(),
          })],
        }).catch(() => {});
      }
    }
  },
};
