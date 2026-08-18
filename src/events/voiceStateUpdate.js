import { Events, ChannelType, PermissionFlagsBits } from 'discord.js';
import db, { getGuildConfig } from '../database/db.js';
import { getExistingQueue } from '../utils/musicPlayer.js';
import { sendLog, COLORS } from '../utils/helpers.js';

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const guild = newState.guild;
    const cfg = getGuildConfig(guild.id);
    const member = newState.member || oldState.member;

    // --- Logs vocaux (arrivée / départ / déplacement), on ignore les bots ---
    if (member && !member.user.bot) {
      if (!oldState.channelId && newState.channelId) {
        await sendLog(guild, { description: `🔊 ${member} a rejoint ${newState.channel}`, color: COLORS.info });
      } else if (oldState.channelId && !newState.channelId) {
        await sendLog(guild, { description: `🔇 ${member} a quitté ${oldState.channel}`, color: COLORS.info });
      } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        await sendLog(guild, { description: `🔀 ${member} : ${oldState.channel} → ${newState.channel}`, color: COLORS.info });
      }
    }

    // --- Musique : quitter si le bot se retrouve seul dans son salon vocal ---
    if (oldState.channelId) {
      const musicQueue = getExistingQueue(guild.id);
      if (musicQueue?.connection && musicQueue.connection.joinConfig.channelId === oldState.channelId) {
        const channel = guild.channels.cache.get(oldState.channelId);
        if (channel && channel.members.filter((m) => !m.user.bot).size === 0) {
          musicQueue.destroy('Salon vocal vide, je me déconnecte.');
        }
      }
    }

    // --- Création : l'utilisateur rejoint le salon "hub" ---
    if (cfg.tempvoice_hub && newState.channelId === cfg.tempvoice_hub) {
      const member = newState.member;
      const parent = cfg.tempvoice_category || newState.channel.parentId;
      try {
        const channel = await guild.channels.create({
          name: `🔊 ${member.user.username}`,
          type: ChannelType.GuildVoice,
          parent: parent || null,
          permissionOverwrites: [
            { id: member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers] },
          ],
        });
        db.prepare('INSERT INTO temp_channels (channel_id, guild_id, owner_id) VALUES (?, ?, ?)')
          .run(channel.id, guild.id, member.id);
        await member.voice.setChannel(channel).catch(() => {});
      } catch (err) {
        console.error('[tempvoice] création échouée :', err.message);
      }
    }

    // --- Suppression : un salon temporaire devient vide ---
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      const temp = db.prepare('SELECT * FROM temp_channels WHERE channel_id = ?').get(oldState.channelId);
      if (temp) {
        const channel = guild.channels.cache.get(oldState.channelId);
        if (channel && channel.members.size === 0) {
          await channel.delete().catch(() => {});
          db.prepare('DELETE FROM temp_channels WHERE channel_id = ?').run(oldState.channelId);
        }
      }
    }
  },
};
