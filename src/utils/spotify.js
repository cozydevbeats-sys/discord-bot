// Intégration Spotify en lecture seule (Client Credentials Flow).
// Spotify ne permet PAS de streamer des morceaux complets via son API — seule
// la métadonnée (titre + artiste) est accessible. On s'en sert pour retrouver
// l'équivalent exact sur YouTube, qui fournit l'audio réel (voir play.js).
//
// Configuration optionnelle : SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET dans .env
// (à créer gratuitement sur https://developer.spotify.com/dashboard).
// Sans ces identifiants, les liens Spotify échouent proprement avec un message clair.

let cachedToken = null;
let tokenExpiry = 0;

async function getSpotifyToken() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;

  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Authentification Spotify échouée (HTTP ${res.status})`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // marge de sécurité de 60s
  return cachedToken;
}

async function spotifyFetch(endpoint) {
  const token = await getSpotifyToken();
  if (!token) throw new Error('NO_SPOTIFY_CREDENTIALS');
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Requête Spotify échouée (HTTP ${res.status})`);
  return res.json();
}

// Détecte un lien Spotify (piste, album ou playlist) et en extrait le type + l'ID
export function parseSpotifyUrl(url) {
  const m = String(url).match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (!m) return null;
  return { type: m[1], id: m[2] };
}

function trackInfo(t) {
  return { name: t.name, artists: t.artists.map((a) => a.name).join(', ') };
}

export async function getSpotifyTrack(id) {
  const data = await spotifyFetch(`/tracks/${id}`);
  return trackInfo(data);
}

export async function getSpotifyAlbumTracks(id) {
  const data = await spotifyFetch(`/albums/${id}/tracks?limit=50`);
  return data.items.map(trackInfo);
}

// Parcourt toutes les pages d'une playlist Spotify (100 pistes par page)
export async function getSpotifyPlaylistTracks(id) {
  const tracks = [];
  let endpoint = `/playlists/${id}/tracks?limit=100`;
  while (endpoint) {
    const data = await spotifyFetch(endpoint);
    for (const item of data.items) {
      if (item.track) tracks.push(trackInfo(item.track));
    }
    endpoint = data.next ? data.next.replace('https://api.spotify.com/v1', '') : null;
  }
  return tracks;
}

export async function searchSpotifyTrack(query) {
  const data = await spotifyFetch(`/search?q=${encodeURIComponent(query)}&type=track&limit=1`);
  const track = data.tracks?.items?.[0];
  return track ? trackInfo(track) : null;
}
