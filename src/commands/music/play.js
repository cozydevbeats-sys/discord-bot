import { SlashCommandBuilder } from 'discord.js';
import { Innertube } from 'youtubei.js';
import { embed, COLORS } from '../../utils/helpers.js';
import { getQueue, formatDuration } from '../../utils/musicPlayer.js';
import { parseSpotifyUrl, getSpotifyTrack, getSpotifyAlbumTracks, getSpotifyPlaylistTracks } from '../../utils/spotify.js';
import {
  parseSpotifyUrl,
  getSpotifyTrack,
  getSpotifyAlbumTracks,
  getSpotifyPlaylistTracks
} from '../../utils/spotify.js';

const MAX_SPOTIFY_IMPORT = 50; // limite raisonnable pour un import d'album/playlist en une fois

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

async function resolveYoutube(searchTerm) {
  const youtube = await getYouTube();

  const results = await youtube.search(searchTerm, {
    type: 'video',
  });

  return results.videos?.[0] || null;
}

async function resolveYoutube(searchTerm) {
  const results = await play.search(searchTerm, { limit: 1, source: { youtube: 'video' } });
  return results[0] || null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Jouer une musique (recherche, lien YouTube ou lien Spotify).')
    .addStringOption((o) => o.setName('requete').setDescription('Titre, URL YouTube, ou URL Spotify (piste/album/playlist)').setRequired(true)),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ embeds: [embed({ description: '❌ Rejoins un salon vocal d\'abord.', color: COLORS.error })], ephemeral: true });
    }

    await interaction.deferReply();
    const query = interaction.options.getString('requete');
    const spotifyRef = parseSpotifyUrl(query);

    // ---------- Lien Spotify : résolution des métadonnées puis recherche YouTube ----------
    if (spotifyRef) {
      let spotifyTracks;
      try {
        if (spotifyRef.type === 'track') spotifyTracks = [await getSpotifyTrack(spotifyRef.id)];
        else if (spotifyRef.type === 'album') spotifyTracks = await getSpotifyAlbumTracks(spotifyRef.id);
        else spotifyTracks = await getSpotifyPlaylistTracks(spotifyRef.id);
      } catch (err) {
        if (err.message === 'NO_SPOTIFY_CREDENTIALS') {
          return interaction.editReply({ embeds: [embed({
            description: '❌ Les liens Spotify ne sont pas configurés sur ce bot (SPOTIFY_CLIENT_ID/SECRET manquants, voir le README). Essaie une recherche par titre ou un lien YouTube à la place.',
            color: COLORS.error,
          })] });
        }
        console.error('[musique] Spotify échoué :', err.message);
        return interaction.editReply({ embeds: [embed({ description: '❌ Impossible de lire ce lien Spotify.', color: COLORS.error })] });
      }

      if (spotifyTracks.length === 0) {
        return interaction.editReply({ embeds: [embed({ description: '❌ Aucune piste trouvée dans ce lien Spotify.', color: COLORS.error })] });
      }

      const queue = getQueue(interaction.guild, interaction.channel);
      if (!queue.connection) {
        try {
          await queue.connect(voiceChannel);
        } catch (err) {
          console.error('[musique] connexion vocale échouée :', err.message);
          return interaction.editReply({ embeds: [embed({ description: '❌ Impossible de rejoindre le salon vocal (vérifie mes permissions Connexion/Voix).', color: COLORS.error })] });
        }
      }

      let added = 0;
      for (const t of spotifyTracks.slice(0, MAX_SPOTIFY_IMPORT)) {
        try {
          const yt = await resolveYoutube(`${t.name} ${t.artists}`);
          if (yt) {
            queue.add({ title: `${t.name} — ${t.artists}`, url: yt.url, duration: yt.durationInSec, requestedBy: interaction.user.toString() });
            added++;
          }
        } catch { /* on saute la piste si sa recherche YouTube échoue */ }
      }

      const skipped = spotifyTracks.length > MAX_SPOTIFY_IMPORT ? `\n(limité aux ${MAX_SPOTIFY_IMPORT} premières pistes)` : '';
      return interaction.editReply({ embeds: [embed({
        title: added > 1 ? '➕ Import Spotify' : '➕ Ajouté depuis Spotify',
        description: `**${added}** piste(s) ajoutée(s) à la file.${skipped}`,
        color: COLORS.success,
      })] });
    }

    // ---------- Recherche classique / lien YouTube ----------

let info;

try {
  const videoId = extractVideoId(query);

  if (videoId) {
    const youtube = await getYouTube();

    const details = await youtube.getBasicInfo(videoId);

    info = {
      title: details.basic_info?.title || 'Titre inconnu',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      durationInSec: Number(details.basic_info?.duration || 0),
    };

  } else {

    const result = await resolveYoutube(query);

    if (!result) {
      return interaction.editReply({
        embeds: [
          embed({
            description:
              '❌ Aucun résultat trouvé pour cette recherche.',
            color: COLORS.error,
          }),
        ],
      });
    }

    info = {
      title: result.title || 'Titre inconnu',
      url: result.url || `https://www.youtube.com/watch?v=${result.id}`,
      durationInSec:
        result.duration?.seconds ??
        result.durationInSec ??
        0,
    };
  }

} catch (err) {

  console.error(
    '[musique] recherche YouTube échouée:',
    err
  );

  return interaction.editReply({
    embeds: [
      embed({
        description:
          '❌ Erreur de recherche YouTube. Réessaie avec un autre titre ou lien.',
        color: COLORS.error,
      }),
    ],
  });
}
