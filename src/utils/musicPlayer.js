import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
  entersState,
} from '@discordjs/voice';

import { Innertube } from 'youtubei.js';
import { Readable } from 'node:stream';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

import { embed, COLORS } from './helpers.js';

const queues = new Map();

const IDLE_TIMEOUT = 5 * 60_000;

let youtubePromise = null;

function getYouTube() {
  if (!youtubePromise) {
    youtubePromise = Innertube.create({
      lang: 'fr',
      location: 'FR',
    });
  }

  return youtubePromise;
}

function extractVideoId(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1);
    }

    if (
      parsed.hostname === 'youtube.com' ||
      parsed.hostname.endsWith('.youtube.com')
    ) {
      return parsed.searchParams.get('v');
    }

    return null;
  } catch {
    return null;
  }
}

class QueueState {
  constructor(guild, textChannel) {
    this.guild = guild;
    this.textChannel = textChannel;
    this.connection = null;
    this.player = createAudioPlayer();
    this.resource = null;
    this.ffmpeg = null;
    this.tracks = [];
    this.current = null;
    this.loopMode = 'off';
    this.volume = 100;
    this.idleTimer = null;

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.playNext().catch((err) => {
        console.error('[musique] erreur playNext:', err);
      });
    });

    this.player.on('error', (err) => {
      console.error('[musique] erreur AudioPlayer:', err);

      this.textChannel?.send({
        embeds: [
          embed({
            description: `❌ Erreur pendant la lecture de **${this.current?.title || '?'}**, passage à la suivante.`,
            color: COLORS.error,
          }),
        ],
      }).catch(() => {});

      this.killFfmpeg();

      this.playNext().catch(() => {});
    });
  }

  async connect(voiceChannel) {
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    this.connection.subscribe(this.player);

    await entersState(
      this.connection,
      VoiceConnectionStatus.Ready,
      15_000
    );
  }

  clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = null;
  }

  scheduleIdleDisconnect() {
    this.clearIdleTimer();

    this.idleTimer = setTimeout(() => {
      this.destroy(
        'Inactivité (5 min sans musique), je me déconnecte.'
      );
    }, IDLE_TIMEOUT);
  }

  killFfmpeg() {
    if (this.ffmpeg) {
      try {
        this.ffmpeg.kill('SIGKILL');
      } catch {}

      this.ffmpeg = null;
    }
  }

  async playNext() {
    this.clearIdleTimer();

    if (this.current) {
      if (this.loopMode === 'track') {
        this.tracks.unshift(this.current);
      } else if (this.loopMode === 'queue') {
        this.tracks.push(this.current);
      }
    }

    this.killFfmpeg();

    const next = this.tracks.shift();

    if (!next) {
      this.current = null;
      this.resource = null;
      this.scheduleIdleDisconnect();
      return;
    }

    this.current = next;

    try {
      const youtube = await getYouTube();

      const videoId = extractVideoId(next.url);

      if (!videoId) {
        throw new Error(`URL YouTube invalide: ${next.url}`);
      }

      console.log(`[musique] récupération du flux: ${videoId}`);

      const stream = await youtube.download(videoId, {
        type: 'audio',
        quality: 'best',
        format: 'mp4',
      });

      const input = Readable.fromWeb(stream);

      this.ffmpeg = spawn(ffmpegPath, [
        '-hide_banner',
        '-loglevel',
        'error',

        '-i',
        'pipe:0',

        '-f',
        's16le',
        '-ar',
        '48000',
        '-ac',
        '2',

        'pipe:1',
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      input.pipe(this.ffmpeg.stdin);

      this.ffmpeg.stderr.on('data', (data) => {
        console.error(
          '[ffmpeg]',
          data.toString().trim()
        );
      });

      this.ffmpeg.on('error', (err) => {
        console.error('[ffmpeg] erreur:', err);
      });

      const resource = createAudioResource(
        this.ffmpeg.stdout,
        {
          inputType: StreamType.Raw,
          inlineVolume: true,
        }
      );

      resource.volume?.setVolume(this.volume / 100);

      this.resource = resource;

      this.player.play(resource);

      await this.textChannel?.send({
        embeds: [
          embed({
            title: '🎶 Lecture en cours',
            description:
              `**${next.title}**\nDemandé par ${next.requestedBy}`,
            color: COLORS.success,
          }),
        ],
      }).catch(() => {});

    } catch (err) {
      console.error(
        '[musique] impossible de lire la piste:',
        err
      );

      this.killFfmpeg();

      await this.textChannel?.send({
        embeds: [
          embed({
            description:
              `❌ Impossible de lire **${next.title}**, passage à la suivante.`,
            color: COLORS.error,
          }),
        ],
      }).catch(() => {});

      this.current = null;

      await this.playNext();
    }
  }

  add(track) {
    this.tracks.push(track);

    if (!this.current) {
      this.playNext().catch((err) => {
        console.error('[musique] erreur:', err);
      });
    }
  }

  skip() {
    this.player.stop();
  }

  setVolume(v) {
    this.volume = v;

    this.resource?.volume?.setVolume(v / 100);
  }

  destroy(reason) {
    this.clearIdleTimer();
    this.killFfmpeg();

    this.tracks = [];
    this.current = null;

    try {
      this.player.stop();
    } catch {}

    try {
      this.connection?.destroy();
    } catch {}

    queues.delete(this.guild.id);

    if (reason) {
      this.textChannel?.send({
        embeds: [
          embed({
            description: `👋 ${reason}`,
            color: COLORS.info,
          }),
        ],
      }).catch(() => {});
    }
  }
}

export function getQueue(guild, textChannel) {
  let q = queues.get(guild.id);

  if (!q) {
    q = new QueueState(guild, textChannel);
    queues.set(guild.id, q);
  }

  return q;
}

export function getExistingQueue(guildId) {
  return queues.get(guildId);
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) {
    return 'Live';
  }

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  return `${m}:${s.toString().padStart(2, '0')}`;
}
