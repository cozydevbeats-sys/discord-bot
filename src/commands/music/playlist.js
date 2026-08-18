import { SlashCommandBuilder } from 'discord.js';
import play from 'play-dl';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';
import { getQueue, formatDuration } from '../../utils/musicPlayer.js';
import { parseSpotifyUrl, getSpotifyTrack } from '../../utils/spotify.js';

const MAX_PLAYLISTS = 25;
const MAX_TRACKS = 100;

// Résout une requête (titre, lien YouTube, ou lien Spotify) vers une piste jouable
async function resolveTrack(query) {
  const spotifyRef = parseSpotifyUrl(query);
  let searchTerm = query;

  if (spotifyRef && spotifyRef.type === 'track') {
    try {
      const t = await getSpotifyTrack(spotifyRef.id);
      searchTerm = `${t.name} ${t.artists}`;
    } catch { /* si Spotify n'est pas configuré, on retente une recherche brute */ }
  }

  if (play.yt_validate(searchTerm) === 'video') {
    const details = await play.video_basic_info(searchTerm);
    return { title: details.video_details.title, url: details.video_details.url, duration: details.video_details.durationInSec };
  }
  const results = await play.search(searchTerm, { limit: 1, source: { youtube: 'video' } });
  if (!results.length) return null;
  return { title: results[0].title, url: results[0].url, duration: results[0].durationInSec };
}

export default {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Gérer tes playlists musicales sauvegardées.')
    .addSubcommand((s) => s.setName('create').setDescription('Créer une playlist vide')
      .addStringOption((o) => o.setName('nom').setDescription('Nom de la playlist').setRequired(true)))
    .addSubcommand((s) => s.setName('add').setDescription('Ajouter une piste à une playlist')
      .addStringOption((o) => o.setName('nom').setDescription('Nom de la playlist').setRequired(true))
      .addStringOption((o) => o.setName('requete').setDescription('Titre, lien YouTube ou lien Spotify').setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription('Retirer une piste d\'une playlist')
      .addStringOption((o) => o.setName('nom').setDescription('Nom de la playlist').setRequired(true))
      .addIntegerOption((o) => o.setName('position').setDescription('Position dans la playlist (voir /playlist view)').setRequired(true).setMinValue(1)))
    .addSubcommand((s) => s.setName('list').setDescription('Voir tes playlists'))
    .addSubcommand((s) => s.setName('view').setDescription('Voir le contenu d\'une playlist')
      .addStringOption((o) => o.setName('nom').setDescription('Nom de la playlist').setRequired(true)))
    .addSubcommand((s) => s.setName('play').setDescription('Charger une playlist dans la file d\'attente')
      .addStringOption((o) => o.setName('nom').setDescription('Nom de la playlist').setRequired(true)))
    .addSubcommand((s) => s.setName('delete').setDescription('Supprimer une playlist')
      .addStringOption((o) => o.setName('nom').setDescription('Nom de la playlist').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    const uid = interaction.user.id;

    if (sub === 'create') {
      const nom = interaction.options.getString('nom').slice(0, 50);
      const count = db.prepare('SELECT COUNT(*) AS c FROM playlists WHERE guild_id = ? AND user_id = ?').get(gid, uid).c;
      if (count >= MAX_PLAYLISTS) {
        return interaction.reply({ embeds: [embed({ description: `❌ Limite de ${MAX_PLAYLISTS} playlists atteinte.`, color: COLORS.error })], ephemeral: true });
      }
      try {
        db.prepare('INSERT INTO playlists (guild_id, user_id, name, tracks, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(gid, uid, nom, '[]', Date.now());
      } catch {
        return interaction.reply({ embeds: [embed({ description: `❌ Tu as déjà une playlist nommée **${nom}**.`, color: COLORS.error })], ephemeral: true });
      }
      return interaction.reply({ embeds: [embed({ description: `✅ Playlist **${nom}** créée. Ajoute des pistes avec \`/playlist add\`.`, color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'add') {
      const nom = interaction.options.getString('nom');
      const requete = interaction.options.getString('requete');
      const pl = db.prepare('SELECT * FROM playlists WHERE guild_id = ? AND user_id = ? AND name = ?').get(gid, uid, nom);
      if (!pl) return interaction.reply({ embeds: [embed({ description: `❌ Playlist **${nom}** introuvable.`, color: COLORS.error })], ephemeral: true });

      const tracks = JSON.parse(pl.tracks);
      if (tracks.length >= MAX_TRACKS) {
        return interaction.reply({ embeds: [embed({ description: `❌ Limite de ${MAX_TRACKS} pistes atteinte pour cette playlist.`, color: COLORS.error })], ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      let track;
      try {
        track = await resolveTrack(requete);
      } catch (err) {
        console.error('[playlist] résolution échouée :', err.message);
        return interaction.editReply({ embeds: [embed({ description: '❌ Erreur de recherche.', color: COLORS.error })] });
      }
      if (!track) return interaction.editReply({ embeds: [embed({ description: '❌ Aucun résultat trouvé.', color: COLORS.error })] });

      tracks.push(track);
      db.prepare('UPDATE playlists SET tracks = ? WHERE id = ?').run(JSON.stringify(tracks), pl.id);
      return interaction.editReply({ embeds: [embed({ description: `✅ **${track.title}** ajoutée à **${nom}** (${tracks.length} piste(s)).`, color: COLORS.success })] });
    }

    if (sub === 'remove') {
      const nom = interaction.options.getString('nom');
      const pos = interaction.options.getInteger('position');
      const pl = db.prepare('SELECT * FROM playlists WHERE guild_id = ? AND user_id = ? AND name = ?').get(gid, uid, nom);
      if (!pl) return interaction.reply({ embeds: [embed({ description: `❌ Playlist **${nom}** introuvable.`, color: COLORS.error })], ephemeral: true });
      const tracks = JSON.parse(pl.tracks);
      if (pos > tracks.length) return interaction.reply({ embeds: [embed({ description: '❌ Position invalide.', color: COLORS.error })], ephemeral: true });
      const [removed] = tracks.splice(pos - 1, 1);
      db.prepare('UPDATE playlists SET tracks = ? WHERE id = ?').run(JSON.stringify(tracks), pl.id);
      return interaction.reply({ embeds: [embed({ description: `🗑️ **${removed.title}** retirée de **${nom}**.`, color: COLORS.success })], ephemeral: true });
    }

    if (sub === 'list') {
      const rows = db.prepare('SELECT name, tracks FROM playlists WHERE guild_id = ? AND user_id = ?').all(gid, uid);
      if (rows.length === 0) return interaction.reply({ embeds: [embed({ description: 'Tu n\'as encore aucune playlist. Crée-en une avec `/playlist create`.', color: COLORS.info })], ephemeral: true });
      const list = rows.map((r) => `🎵 **${r.name}** — ${JSON.parse(r.tracks).length} piste(s)`).join('\n');
      return interaction.reply({ embeds: [embed({ title: '📀 Tes playlists', description: list })], ephemeral: true });
    }

    if (sub === 'view') {
      const nom = interaction.options.getString('nom');
      const pl = db.prepare('SELECT * FROM playlists WHERE guild_id = ? AND user_id = ? AND name = ?').get(gid, uid, nom);
      if (!pl) return interaction.reply({ embeds: [embed({ description: `❌ Playlist **${nom}** introuvable.`, color: COLORS.error })], ephemeral: true });
      const tracks = JSON.parse(pl.tracks);
      if (tracks.length === 0) return interaction.reply({ embeds: [embed({ description: `**${nom}** est vide. Ajoute des pistes avec \`/playlist add\`.`, color: COLORS.info })], ephemeral: true });
      const list = tracks.slice(0, 20).map((t, i) => `**${i + 1}.** ${t.title} (${formatDuration(t.duration)})`).join('\n');
      const more = tracks.length > 20 ? `\n... et ${tracks.length - 20} de plus` : '';
      return interaction.reply({ embeds: [embed({ title: `📀 ${nom} (${tracks.length} piste(s))`, description: list + more })], ephemeral: true });
    }

    if (sub === 'play') {
      const nom = interaction.options.getString('nom');
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) return interaction.reply({ embeds: [embed({ description: '❌ Rejoins un salon vocal d\'abord.', color: COLORS.error })], ephemeral: true });

      const pl = db.prepare('SELECT * FROM playlists WHERE guild_id = ? AND user_id = ? AND name = ?').get(gid, uid, nom);
      if (!pl) return interaction.reply({ embeds: [embed({ description: `❌ Playlist **${nom}** introuvable.`, color: COLORS.error })], ephemeral: true });
      const tracks = JSON.parse(pl.tracks);
      if (tracks.length === 0) return interaction.reply({ embeds: [embed({ description: `**${nom}** est vide.`, color: COLORS.info })], ephemeral: true });

      await interaction.deferReply();
      const queue = getQueue(interaction.guild, interaction.channel);
      if (!queue.connection) {
        try {
          await queue.connect(voiceChannel);
        } catch {
          return interaction.editReply({ embeds: [embed({ description: '❌ Impossible de rejoindre le salon vocal.', color: COLORS.error })] });
        }
      }
      for (const t of tracks) {
        queue.add({ title: t.title, url: t.url, duration: t.duration, requestedBy: interaction.user.toString() });
      }
      return interaction.editReply({ embeds: [embed({ title: '📀 Playlist chargée', description: `**${tracks.length}** piste(s) de **${nom}** ajoutée(s) à la file.`, color: COLORS.success })] });
    }

    if (sub === 'delete') {
      const nom = interaction.options.getString('nom');
      const info = db.prepare('DELETE FROM playlists WHERE guild_id = ? AND user_id = ? AND name = ?').run(gid, uid, nom);
      if (info.changes === 0) return interaction.reply({ embeds: [embed({ description: `❌ Playlist **${nom}** introuvable.`, color: COLORS.error })], ephemeral: true });
      return interaction.reply({ embeds: [embed({ description: `🗑️ Playlist **${nom}** supprimée.`, color: COLORS.success })], ephemeral: true });
    }
  },
};
