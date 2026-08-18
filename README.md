# 🤖 All-in-One Bot

Un seul bot Discord qui reprend les fonctionnalités phares des plus gros bots
(MEE6, Dyno, Carl-bot, Ticket Tool, ProBot, UnbelievaBoat).

Écrit en **discord.js v14** (slash commands) avec une base **SQLite** locale.
Architecture modulaire : chaque commande et chaque événement est un fichier séparé,
chargé automatiquement — pour en ajouter, tu déposes juste un fichier.

## ✨ Fonctionnalités

| Module | Ce que ça fait |
|--------|----------------|
| **Modération** | `/ban` `/kick` `/timeout` `/warn` `/warnings` `/clear` `/softban` `/unban` `/nick` `/slowmode` `/lock` `/modlogs` |
| **Historique** | Toutes les sanctions journalisées → `/modlogs membre:` |
| **Auto-mod** | Anti-spam (mute auto), anti-invitations, filtre de mots |
| **Niveaux** | XP par message, `/rank`, `/leaderboard`, level-up + **récompenses de rôles** (`/levelrewards`) |
| **Logs** | Ban/kick/mute/warn/clear/auto-mod/tickets + **messages supprimés & édités** |
| **Économie** | `/balance` `/daily` `/work` `/pay` `/bank` `/richest` `/slots` |
| **Fun** | `/8ball` `/roll` `/rps` `/coinflip` |
| **Bienvenue / départ** | Embeds auto avec variables `{user}` `{server}` `{membercount}` + autorole |
| **Rôles-boutons** | `/reactionrole` (boutons) + `/rolemenu` (menu déroulant multi-choix) |
| **Vérification** | `/verifysetup` → bouton d'accès qui donne un rôle |
| **Tickets** | `/ticketsetup` → formulaire, prise en charge (claim), **transcription .txt** à la fermeture |
| **Anniversaires** | `/birthday set` + annonce auto le jour J |
| **Salons-compteurs** | `/statssetup` → salon vocal affichant membres/bots/boosts, auto-mis à jour |
| **Logs** | Journalise ban / kick / mute / warn / clear / auto-mod / tickets |
| **Giveaways** | `/giveaway start\|end\|reroll` — participation par bouton, tirage auto |
| **Suggestions** | `/suggest` (vote 👍/👎 par bouton) + `/suggestion approve\|deny` |
| **Starboard** | Réagis ⭐ à un message → épinglé dans le salon starboard au seuil défini |
| **Anti-raid** | Filtre de comptes récents + détection de vagues d'arrivées |
| **Embeds custom** | `/embed` (titre, description, couleur, image, footer, salon) |
| **Rappels** | `/remind duree texte` — MP/salon à l'heure dite |
| **Tags** | `/tag create\|edit\|delete\|list\|show` — réponses réutilisables |
| **Auto-responders** | `/autoresponder add\|remove\|list` — réponse auto sur mot-clé |
| **Vocaux temporaires** | Rejoins un salon « hub » → ton propre salon vocal créé et supprimé quand vide |
| **AFK** | `/afk` — signale ton absence, ping automatique quand on te mentionne |
| **Invitations** | Suivi automatique de qui a invité qui → `/invites voir\|top` |
| **Snipe** | `/snipe` — revoir le dernier message supprimé d'un salon |
| **Logs étendus** | Vocal (arrivée/départ/déplacement), changements de pseudo et de rôles |
| **Auto-sanction** | `/config warnauto` — timeout automatique après N avertissements |
| **Météo** | `/weather ville:` — météo actuelle, gratuit, sans clé API |
| **Pokémon** | Apparitions, capture, équipe de combat, échanges, objets/boutique — voir section dédiée |
| **Musique** | File d'attente, **Spotify**, **playlists sauvegardées** — voir section dédiée |
| **Utilitaires** | `/userinfo` `/serverinfo` `/avatar` `/poll` `/ping` `/help` |

## 🚀 Installation

### 1. Prérequis
- [Node.js **18+**](https://nodejs.org)
- `better-sqlite3` se compile à l'installation : sous **Windows**, installe
  « **Desktop development with C++** » via Visual Studio Build Tools si `npm install` échoue.

### 2. Créer l'application Discord
1. Va sur https://discord.com/developers/applications → **New Application**
2. Onglet **Bot** → **Reset Token** → copie le token
3. Toujours dans **Bot**, active les 3 **Privileged Gateway Intents** :
   - `PRESENCE INTENT` (optionnel)
   - `SERVER MEMBERS INTENT` ✅ (obligatoire)
   - `MESSAGE CONTENT INTENT` ✅ (obligatoire)
4. Onglet **OAuth2 → URL Generator** : scopes `bot` + `applications.commands`,
   permissions `Administrator` (ou plus fin), puis ouvre l'URL pour l'inviter.

### 3. Configurer et lancer
```bash
npm install

# copie le modèle de config et remplis-le
cp .env.example .env      # (Windows : copy .env.example .env)

# déploie les commandes slash (à refaire seulement si tu ajoutes/modifies des commandes)
npm run deploy

# démarre le bot
npm start
```

## ⚙️ Configuration in-app (une fois le bot en ligne)

```
/config voir                          → voir la config actuelle
/config bienvenue salon:#arrivées     → active les messages de bienvenue
/config logs salon:#logs              → active les logs de modération
/config autorole role:@Membre         → rôle auto pour les nouveaux
/config automod module:Anti-spam actif:true
/config badwords mots:mot1, mot2      → liste noire pour le filtre
/config suggestions salon:#suggestions → salon des suggestions
/config starboard salon:#best seuil:5   → starboard (⭐)
/config antiraid actif:true age_min_jours:7 seuil_arrivees:10 fenetre_secondes:10
/config tempvoice hub:🔊Créer categorie:Vocaux → salons vocaux temporaires
/config pokemon salon:#pokemon        → salon d'apparition des Pokémon
/config warnauto seuil:3 minutes:60   → timeout auto au 3ᵉ avertissement
/autoresponder add declencheur:bonjour reponse:Salut ! → réponse auto
/reactionrole titre:... role1:@X label1:...   → panneau de rôles
/ticketsetup categorie:... role_support:@Staff → système de tickets
```

Le suivi des invitations (`/invites`) démarre automatiquement dès que le bot
est en ligne — aucune configuration nécessaire, juste la permission
**Gérer le serveur**.

## 🐾 Module Pokémon

Un mini Pokécord intégré : des Pokémon sauvages apparaissent aléatoirement
dans le salon configuré, les membres les devinent et les capturent, les
font monter de niveau en discutant, évoluer, et s'affrontent entre eux.

### Activer les apparitions
```
/config pokemon salon:#pokemon
```
Un Pokémon apparaît environ tous les 12 à 20 messages dans ce salon.

### Commandes
| Commande | Effet |
|---|---|
| `/catch nom:<nom> [balle:]` | Capturer le Pokémon apparu (Ball optionnelle contre la fuite) |
| `/pokedex nom:` | Fiche d'un Pokémon (types, rareté, évolution) |
| `/pokemon list\|info\|select\|nickname\|release\|dex\|top` | Gérer ta collection |
| `/team add\|remove\|view` | Composer une équipe de combat (jusqu'à 6 Pokémon) |
| `/pokebattle adversaire:` | Combat d'équipe (ou Pokémon actif si pas d'équipe) — PV persistants entre combats |
| `/pokeshop` | Voir la boutique d'objets |
| `/pokebuy item: quantite:` | Acheter un objet avec tes pièces 🪙 |
| `/pokeitem list\|use` | Voir ton inventaire / utiliser un objet |
| `/trade offer\|cancel` | Proposer un échange 1 contre 1 (confirmation par boutons) |

### Combats d'équipe et PV

Avec `/team add`, jusqu'à 6 Pokémon combattent à la suite : le suivant prend
le relais dès qu'un est mis K.O. Les PV restants sont **sauvegardés** après
chaque combat (`/pokebattle`) — un Pokémon à 0 PV reste K.O. tant qu'il n'est
pas soigné avec une Potion (`/pokeitem use`). Sans équipe, `/pokebattle`
retombe sur ton Pokémon actif (`/pokemon select`), en 1 contre 1 classique.

### Objets

| Objet | Effet |
|---|---|
| 🧪 Potion / 💊 Super Potion / ✨ Guérison | Restaurent des PV (partiel ou total) |
| 🍬 Super Bonbon | Fait gagner un niveau instantanément |
| 💎 Pierre d'évolution | Force l'évolution, sans condition de niveau |
| 🔵 Super Ball / 🟡 Hyper Ball | Réduisent la chance de fuite des Pokémon rares/légendaires à la capture |

Tout s'achète en pièces 🪙 via `/pokebuy` — la même monnaie que le module
Économie (`/daily`, `/work`, `/slots`...).


### 151 par défaut → débloquer les 1025

Le bot embarque directement le Pokédex complet de la **génération 1 (151)**,
donc tout fonctionne dès l'installation, sans rien à configurer.

Pour débloquer les **1025 Pokémon** (toutes générations), le bot va chercher
les vraies données (noms, types, évolutions) sur **PokéAPI**
(https://pokeapi.co — base de données publique et gratuite, sans clé) :

```bash
npm run fetch-pokedex          # les 1025, ~5-10 min, nécessite Internet
npm run fetch-pokedex -- 251   # optionnel : s'arrêter à une génération donnée
```

Ça génère `src/data/pokedex-full.json`. Redémarre le bot ensuite — il bascule
automatiquement dessus (message `[pokedex] 1025 Pokémon chargés...` au démarrage).
Aucune donnée n'est codée en dur pour les générations 2+ : c'est PokéAPI qui
fait foi, donc c'est toujours à jour si tu relances le script plus tard.

Les sprites (y compris shiny) viennent du dépôt public
`PokeAPI/sprites` sur GitHub et couvrent déjà les 1025.

## 🎵 Module Musique

Un bot musical façon Rythm : recherche/lien YouTube, file d'attente, pause,
volume, répétition, mélange. Aucune donnée persistée en base — comme la
plupart des bots musique, la file ne survit pas à un redémarrage.

### ⚠️ À savoir avant d'activer ce module

Rythm et Groovy ont été fermés en 2021 suite à une mise en demeure de
YouTube/Google : extraire l'audio d'une vidéo YouTube viole ses conditions
d'utilisation. Ce module utilise la même technique (bibliothèque `play-dl`)
que la quasi-totalité des bots musique auto-hébergés aujourd'hui — c'est
courant pour un usage personnel sur tes propres serveurs, mais ce n'est pas
dans les clous des CGU YouTube. À toi de voir selon l'usage que tu en fais
(serveur privé entre amis vs bot public à grande échelle).

### Installation (dépendances supplémentaires)

```bash
npm install
```
`package.json` inclut déjà `@discordjs/voice`, `@discordjs/opus`,
`ffmpeg-static` et `play-dl` — `ffmpeg-static` fournit son propre binaire
ffmpeg, rien à installer à côté.

`@discordjs/opus` est un module natif (comme `better-sqlite3`) : sous
Windows, il faut les **Build Tools C++** de Visual Studio. Si l'install
plante à cause de lui, remplace-le par l'alternative pure JS (plus lente
mais sans compilation) :
```bash
npm uninstall @discordjs/opus
npm install opusscript
```

Le bot a besoin des permissions Discord **Se connecter** et **Parler** sur
les salons vocaux (déjà incluses si tu l'as invité avec `Administrator`).

### Commandes
| Commande | Effet |
|---|---|
| `/play requete:` | Chercher (titre) ou coller un lien YouTube, ajoute à la file |
| `/skip` | Passer à la musique suivante |
| `/pause` / `/resume` | Mettre en pause / reprendre |
| `/stop` | Arrêter, vider la file et quitter le vocal |
| `/leave` | Quitter le vocal (garde la file en mémoire) |
| `/queue` | Voir la file d'attente |
| `/nowplaying` | Musique en cours + progression |
| `/volume niveau:` | Régler le volume (0-100) |
| `/loop mode:` | Répétition off / piste / file |
| `/shuffle` | Mélanger la file |
| `/remove position:` | Retirer une piste de la file |
| `/clearqueue` | Vider la file (garde la piste en cours) |

Le bot se déconnecte tout seul après 5 minutes sans musique, ou dès qu'il
se retrouve seul dans le salon vocal.

### 🟢 Liens Spotify

`/play` accepte aussi un lien Spotify (piste, album ou playlist) — le bot
récupère le titre + artiste via l'API Spotify (métadonnées uniquement,
Spotify n'autorise pas le streaming complet d'un morceau via son API), puis
cherche et joue l'équivalent exact sur YouTube. Un lien album/playlist
importe jusqu'à 50 pistes d'un coup.

Nécessite une appli Spotify gratuite (aucun coût, 2 minutes) :
1. Va sur https://developer.spotify.com/dashboard → **Create app**
2. Récupère le **Client ID** et le **Client Secret**
3. Colle-les dans `.env` :
```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
```
Sans ces identifiants, tout le reste du bot fonctionne normalement — seuls
les liens Spotify échouent avec un message clair invitant à utiliser une
recherche par titre ou un lien YouTube à la place.

### 📀 Playlists sauvegardées

Chaque membre peut se constituer des playlists persistantes (jusqu'à 25
par personne, 100 pistes chacune), acceptant titres, liens YouTube et liens
Spotify :

| Commande | Effet |
|---|---|
| `/playlist create nom:` | Créer une playlist vide |
| `/playlist add nom: requete:` | Ajouter une piste (titre, lien YouTube ou Spotify) |
| `/playlist remove nom: position:` | Retirer une piste |
| `/playlist list` | Voir toutes tes playlists |
| `/playlist view nom:` | Voir le contenu d'une playlist |
| `/playlist play nom:` | Charger toute la playlist dans la file d'attente |
| `/playlist delete nom:` | Supprimer une playlist |

## 📁 Structure

```
allinone-bot/
├── index.js              # point d'entrée
├── deploy-commands.js    # enregistre les slash commands
├── .env.example
├── src/
│   ├── database/db.js    # SQLite + helpers de config
│   ├── handlers/         # chargement auto commandes + events
│   ├── commands/         # 1 dossier = 1 catégorie
│   ├── events/           # ready, interactionCreate, messageCreate, etc.
│   └── utils/            # helpers, automod
```

## ➕ Ajouter une commande

Crée un fichier dans `src/commands/<catégorie>/` :

```js
import { SlashCommandBuilder } from 'discord.js';
export default {
  data: new SlashCommandBuilder().setName('hello').setDescription('Dit bonjour'),
  async execute(interaction) {
    await interaction.reply('Salut !');
  },
};
```

Puis `npm run deploy` et relance. C'est tout.

---
*Bon dev, Max 🎮*
