import {
  joinVoiceChannel, createAudioPlayer, createAudioResource,
  AudioPlayerStatus, VoiceConnectionStatus, entersState,
} from '@discordjs/voice';
import play from 'play-dl';
import { embed, COLORS } from './helpers.js';

// Une file d'attente par serveur, tenue en mémoire (pas persistée en base :
// comme la plupart des bots musique, la file ne survit pas à un redémarrage).
const queues = new Map(); // guildId -> QueueState

const IDLE_TIMEOUT = 5 * 60_000; // déconnexion après 5 min sans musique

class QueueState {
  constructor(guild, textChannel) {
    this.guild = guild;
    this.textChannel = textChannel;
    this.connection = null;
    this.player = createAudioPlayer();
    this.resource = null;
    this.tracks = [];        // { title, url, duration, requestedBy }
    this.current = null;
    this.loopMode = 'off';   // off | track | queue
    this.volume = 100;
    this.idleTimer = null;

    this.player.on(AudioPlayerStatus.Idle, () => this.playNext());
    this.player.on('error', (err) => {
      console.error('[musique] erreur de lecture :', err.message);
      this.textChannel?.send({
        embeds: [embed({ description: `❌ Erreur pendant la lecture de **${this.current?.title || '?'}**, passage à la suivante.`, color: COLORS.error })],
      }).catch(() => {});
      this.playNext();
    });
  }

  async connect(voiceChannel) {
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });
    this.connection.subscribe(this.player);
    await entersState(this.connection, VoiceConnectionStatus.Ready, 15_000);
  }

  clearIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  scheduleIdleDisconnect() {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => this.destroy('Inactivité (5 min sans musique), je me déconnecte.'), IDLE_TIMEOUT);
  }

  async playNext() {
    this.clearIdleTimer();

    // Gestion de la répétition : on remet la piste qui vient de se terminer en file
    if (this.current) {
      if (this.loopMode === 'track') this.tracks.unshift(this.current);
      else if (this.loopMode === 'queue') this.tracks.push(this.current);
    }

    const next = this.tracks.shift();
    if (!next) {
      this.current = null;
      this.scheduleIdleDisconnect();
      return;
    }

    this.current = next;
    try {
      const source = await play.stream(next.url);
      const resource = createAudioResource(source.stream, { inputType: source.type, inlineVolume: true });
      resource.volume?.setVolume(this.volume / 100);
      this.resource = resource;
      this.player.play(resource);
      this.textChannel?.send({
        embeds: [embed({ title: '🎶 Lecture en cours', description: `**${next.title}**\nDemandé par ${next.requestedBy}`, color: COLORS.success })],
      }).catch(() => {});
    } catch (err) {
      console.error('[musique] impossible de lire la piste :', err.message);
      this.textChannel?.send({
        embeds: [embed({ description: `❌ Impossible de lire **${next.title}**, passage à la suivante.`, color: COLORS.error })],
      }).catch(() => {});
      this.playNext();
    }
  }

  add(track) {
    this.tracks.push(track);
    if (!this.current) this.playNext();
  }

  skip() {
    this.player.stop(); // déclenche l'état Idle -> playNext()
  }

  setVolume(v) {
    this.volume = v;
    this.resource?.volume?.setVolume(v / 100);
  }

  destroy(reason) {
    this.clearIdleTimer();
    this.tracks = [];
    this.current = null;
    try { this.player.stop(); } catch { /* déjà arrêté */ }
    try { this.connection?.destroy(); } catch { /* déjà détruite */ }
    queues.delete(this.guild.id);
    if (reason) this.textChannel?.send({ embeds: [embed({ description: `👋 ${reason}`, color: COLORS.info })] }).catch(() => {});
  }
}

// Récupère (ou crée) la file d'un serveur
export function getQueue(guild, textChannel) {
  let q = queues.get(guild.id);
  if (!q) {
    q = new QueueState(guild, textChannel);
    queues.set(guild.id, q);
  }
  return q;
}

// Récupère la file existante sans en créer une nouvelle (pour les commandes qui exigent une lecture en cours)
export function getExistingQueue(guildId) {
  return queues.get(guildId);
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return 'Live';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
