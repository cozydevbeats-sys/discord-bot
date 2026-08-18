import { SlashCommandBuilder } from 'discord.js';
import play from 'play-dl';
import { embed, COLORS } from '../../utils/helpers.js';
import { getQueue, formatDuration } from '../../utils/musicPlayer.js';
import { parseSpotifyUrl, getSpotifyTrack, getSpotifyAlbumTracks, getSpotifyPlaylistTracks } from '../../utils/spotify.js';

const MAX_SPOTIFY_IMPORT = 50; // limite raisonnable pour un import d'album/playlist en une fois

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
      if (play.yt_validate(query) === 'video') {
        const details = await play.video_basic_info(query);
        info = details.video_details;
      } else {
        const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
        if (!results.length) {
          return interaction.editReply({ embeds: [embed({ description: '❌ Aucun résultat trouvé pour cette recherche.', color: COLORS.error })] });
        }
        info = results[0];
      }
    } catch (err) {
      console.error('[musique] recherche échouée :', err.message);
      return interaction.editReply({ embeds: [embed({ description: '❌ Erreur de recherche. Réessaie, ou vérifie le lien.', color: COLORS.error })] });
    }

    const track = {
      title: info.title || 'Titre inconnu',
      url: info.url,
      duration: info.durationInSec,
      requestedBy: interaction.user.toString(),
    };

    const queue = getQueue(interaction.guild, interaction.channel);
    if (!queue.connection) {
      try {
        await queue.connect(voiceChannel);
      } catch (err) {
        console.error('[musique] connexion vocale échouée :', err.message);
        return interaction.editReply({ embeds: [embed({ description: '❌ Impossible de rejoindre le salon vocal (vérifie mes permissions Connexion/Voix).', color: COLORS.error })] });
      }
    }

    const wasIdle = !queue.current;
    queue.add(track);

    await interaction.editReply({ embeds: [embed({
      title: wasIdle ? '🎶 Lecture démarrée' : '➕ Ajouté à la file',
      description: `**${track.title}**\nDurée : ${formatDuration(track.duration)} · Demandé par ${interaction.user}`,
      color: COLORS.success,
    })] });
  },
};
