import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { setGuildConfig, getGuildConfig } from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configurer le bot pour ce serveur.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('bienvenue').setDescription('Salon + message de bienvenue')
      .addChannelOption((o) => o.setName('salon').setDescription('Salon de bienvenue').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName('message').setDescription('Variables : {user} {username} {server} {membercount}')))
    .addSubcommand((s) => s.setName('depart').setDescription('Salon + message de départ')
      .addChannelOption((o) => o.setName('salon').setDescription('Salon de départ').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName('message').setDescription('Variables : {username} {server} {membercount}')))
    .addSubcommand((s) => s.setName('logs').setDescription('Salon des logs de modération')
      .addChannelOption((o) => o.setName('salon').setDescription('Salon des logs').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('niveaux').setDescription('Salon d\'annonce des niveaux')
      .addChannelOption((o) => o.setName('salon').setDescription('Salon (laisse vide = salon du message)').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName('message').setDescription('Variables : {user} {level}')))
    .addSubcommand((s) => s.setName('autorole').setDescription('Rôle donné automatiquement aux nouveaux')
      .addRoleOption((o) => o.setName('role').setDescription('Le rôle').setRequired(true)))
    .addSubcommand((s) => s.setName('automod').setDescription('Activer/désactiver un module d\'auto-modération')
      .addStringOption((o) => o.setName('module').setDescription('Le module').setRequired(true)
        .addChoices({ name: 'Anti-spam', value: 'spam' }, { name: 'Anti-invitations', value: 'invites' }, { name: 'Filtre de mots', value: 'badwords' }))
      .addBooleanOption((o) => o.setName('actif').setDescription('Activer ?').setRequired(true)))
    .addSubcommand((s) => s.setName('badwords').setDescription('Définir la liste de mots interdits (séparés par des virgules)')
      .addStringOption((o) => o.setName('mots').setDescription('ex: mot1, mot2, mot3').setRequired(true)))
    .addSubcommand((s) => s.setName('suggestions').setDescription('Salon où arrivent les suggestions')
      .addChannelOption((o) => o.setName('salon').setDescription('Salon des suggestions').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('starboard').setDescription('Salon + seuil du starboard (⭐)')
      .addChannelOption((o) => o.setName('salon').setDescription('Salon du starboard').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addIntegerOption((o) => o.setName('seuil').setDescription('Nombre d\'étoiles requis (défaut 3)').setMinValue(1)))
    .addSubcommand((s) => s.setName('antiraid').setDescription('Configurer la protection anti-raid')
      .addBooleanOption((o) => o.setName('actif').setDescription('Activer la protection').setRequired(true))
      .addIntegerOption((o) => o.setName('age_min_jours').setDescription('Âge minimum du compte en jours (0 = off)').setMinValue(0))
      .addIntegerOption((o) => o.setName('seuil_arrivees').setDescription('Nb d\'arrivées déclenchant une alerte (0 = off)').setMinValue(0))
      .addIntegerOption((o) => o.setName('fenetre_secondes').setDescription('Fenêtre de détection en secondes (défaut 10)').setMinValue(1)))
    .addSubcommand((s) => s.setName('tempvoice').setDescription('Salon vocal « à rejoindre pour créer »')
      .addChannelOption((o) => o.setName('hub').setDescription('Salon vocal déclencheur').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
      .addChannelOption((o) => o.setName('categorie').setDescription('Catégorie où créer les salons temporaires').addChannelTypes(ChannelType.GuildCategory)))
    .addSubcommand((s) => s.setName('birthdays').setDescription('Salon d\'annonce des anniversaires')
      .addChannelOption((o) => o.setName('salon').setDescription('Salon des anniversaires').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('pokemon').setDescription('Salon où les Pokémon sauvages apparaissent')
      .addChannelOption((o) => o.setName('salon').setDescription('Salon d\'apparition').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('warnauto').setDescription('Sanction automatique après N avertissements')
      .addIntegerOption((o) => o.setName('seuil').setDescription('Nombre d\'avertissements déclenchant la sanction (0 = désactivé)').setRequired(true).setMinValue(0))
      .addIntegerOption((o) => o.setName('minutes').setDescription('Durée du timeout automatique en minutes (défaut 60)').setMinValue(1)))
    .addSubcommand((s) => s.setName('voir').setDescription('Voir la configuration actuelle')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    switch (sub) {
      case 'bienvenue': {
        const salon = interaction.options.getChannel('salon');
        const message = interaction.options.getString('message');
        setGuildConfig(gid, 'welcome_channel', salon.id);
        if (message) setGuildConfig(gid, 'welcome_message', message);
        return ok(interaction, `Message de bienvenue configuré dans ${salon}.`);
      }
      case 'depart': {
        const salon = interaction.options.getChannel('salon');
        const message = interaction.options.getString('message');
        setGuildConfig(gid, 'leave_channel', salon.id);
        if (message) setGuildConfig(gid, 'leave_message', message);
        return ok(interaction, `Message de départ configuré dans ${salon}.`);
      }
      case 'logs': {
        const salon = interaction.options.getChannel('salon');
        setGuildConfig(gid, 'log_channel', salon.id);
        return ok(interaction, `Salon de logs configuré : ${salon}.`);
      }
      case 'niveaux': {
        const salon = interaction.options.getChannel('salon');
        const message = interaction.options.getString('message');
        setGuildConfig(gid, 'level_channel', salon.id);
        if (message) setGuildConfig(gid, 'level_up_message', message);
        return ok(interaction, `Annonces de niveau configurées dans ${salon}.`);
      }
      case 'autorole': {
        const role = interaction.options.getRole('role');
        setGuildConfig(gid, 'autorole', role.id);
        return ok(interaction, `Rôle automatique : ${role}.`);
      }
      case 'automod': {
        const mod = interaction.options.getString('module');
        const actif = interaction.options.getBoolean('actif');
        setGuildConfig(gid, `automod_${mod}`, actif ? 1 : 0);
        return ok(interaction, `Module **${mod}** ${actif ? 'activé ✅' : 'désactivé ❌'}.`);
      }
      case 'badwords': {
        const mots = interaction.options.getString('mots');
        setGuildConfig(gid, 'badwords', mots);
        return ok(interaction, `Liste de mots interdits enregistrée (${mots.split(',').length} mot(s)).`);
      }
      case 'suggestions': {
        const salon = interaction.options.getChannel('salon');
        setGuildConfig(gid, 'suggestion_channel', salon.id);
        return ok(interaction, `Salon des suggestions : ${salon}.`);
      }
      case 'starboard': {
        const salon = interaction.options.getChannel('salon');
        const seuil = interaction.options.getInteger('seuil');
        setGuildConfig(gid, 'starboard_channel', salon.id);
        if (seuil) setGuildConfig(gid, 'star_threshold', seuil);
        return ok(interaction, `Starboard : ${salon} (seuil ${seuil || 3} ⭐).`);
      }
      case 'antiraid': {
        const actif = interaction.options.getBoolean('actif');
        const age = interaction.options.getInteger('age_min_jours');
        const seuil = interaction.options.getInteger('seuil_arrivees');
        const fenetre = interaction.options.getInteger('fenetre_secondes');
        setGuildConfig(gid, 'antiraid_enabled', actif ? 1 : 0);
        if (age !== null) setGuildConfig(gid, 'min_account_age', age);
        if (seuil !== null) setGuildConfig(gid, 'raid_threshold', seuil);
        if (fenetre !== null) setGuildConfig(gid, 'raid_window', fenetre);
        return ok(interaction, `Anti-raid ${actif ? 'activé ✅' : 'désactivé ❌'}.`);
      }
      case 'tempvoice': {
        const hub = interaction.options.getChannel('hub');
        const cat = interaction.options.getChannel('categorie');
        setGuildConfig(gid, 'tempvoice_hub', hub.id);
        if (cat) setGuildConfig(gid, 'tempvoice_category', cat.id);
        return ok(interaction, `Salon vocal temporaire : rejoins ${hub} pour créer le tien.`);
      }
      case 'birthdays': {
        const salon = interaction.options.getChannel('salon');
        setGuildConfig(gid, 'birthday_channel', salon.id);
        return ok(interaction, `Annonces d'anniversaires dans ${salon}.`);
      }
      case 'pokemon': {
        const salon = interaction.options.getChannel('salon');
        setGuildConfig(gid, 'pokemon_channel', salon.id);
        return ok(interaction, `Les Pokémon sauvages apparaîtront dans ${salon}.`);
      }
      case 'warnauto': {
        const seuil = interaction.options.getInteger('seuil');
        const minutes = interaction.options.getInteger('minutes');
        setGuildConfig(gid, 'warn_threshold', seuil);
        if (minutes) setGuildConfig(gid, 'warn_timeout_minutes', minutes);
        return ok(interaction, seuil > 0
          ? `Sanction automatique : timeout de ${minutes || 60} min au ${seuil}ᵉ avertissement.`
          : 'Sanction automatique désactivée.');
      }
      case 'voir': {
        const c = getGuildConfig(gid);
        const chan = (id) => (id ? `<#${id}>` : '—');
        const role = (id) => (id ? `<@&${id}>` : '—');
        return interaction.reply({ embeds: [embed({
          title: '⚙️ Configuration du serveur',
          fields: [
            { name: 'Bienvenue', value: chan(c.welcome_channel), inline: true },
            { name: 'Départ', value: chan(c.leave_channel), inline: true },
            { name: 'Logs', value: chan(c.log_channel), inline: true },
            { name: 'Niveaux', value: chan(c.level_channel), inline: true },
            { name: 'Autorole', value: role(c.autorole), inline: true },
            { name: 'Suggestions', value: chan(c.suggestion_channel), inline: true },
            { name: 'Starboard', value: `${chan(c.starboard_channel)} (${c.star_threshold}⭐)`, inline: true },
            { name: 'Anti-spam', value: c.automod_spam ? '✅' : '❌', inline: true },
            { name: 'Anti-invit.', value: c.automod_invites ? '✅' : '❌', inline: true },
            { name: 'Filtre mots', value: c.automod_badwords ? '✅' : '❌', inline: true },
            { name: 'Anti-raid', value: c.antiraid_enabled ? `✅ (âge ${c.min_account_age}j, seuil ${c.raid_threshold}/${c.raid_window}s)` : '❌', inline: false },
            { name: 'Sanction auto', value: c.warn_threshold > 0 ? `✅ timeout ${c.warn_timeout_minutes}min au ${c.warn_threshold}ᵉ warn` : '❌', inline: false },
          ],
        })], ephemeral: true });
      }
    }
  },
};

function ok(interaction, msg) {
  return interaction.reply({ embeds: [embed({ description: `✅ ${msg}`, color: COLORS.success })], ephemeral: true });
}
