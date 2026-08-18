import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';
import { computeStat } from '../../utils/stats.js';

export default {
  data: new SlashCommandBuilder()
    .setName('statssetup')
    .setDescription('Créer un salon-compteur qui affiche une statistique du serveur.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName('type').setDescription('Statistique à afficher').setRequired(true)
      .addChoices(
        { name: 'Membres (total)', value: 'members' },
        { name: 'Humains', value: 'humans' },
        { name: 'Bots', value: 'bots' },
        { name: 'Boosts', value: 'boosts' },
      ))
    .addStringOption((o) => o.setName('modele').setDescription('Modèle, ex: "👥 Membres : {count}" ({count} = valeur)')),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    const template = interaction.options.getString('modele') || defaultTemplate(type);

    const value = computeStat(interaction.guild, type);
    const name = template.replace('{count}', value).slice(0, 100);

    const channel = await interaction.guild.channels.create({
      name,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }, // salon d'affichage, pas de connexion
      ],
    });

    db.prepare('INSERT INTO stats_channels (channel_id, guild_id, type, template) VALUES (?, ?, ?, ?)')
      .run(channel.id, interaction.guild.id, type, template);

    await interaction.reply({ embeds: [embed({ description: `✅ Salon-compteur créé : **${name}** (mis à jour toutes les ~10 min).`, color: COLORS.success })], ephemeral: true });
  },
};

function defaultTemplate(type) {
  return {
    members: '👥 Membres : {count}',
    humans: '🧑 Humains : {count}',
    bots: '🤖 Bots : {count}',
    boosts: '🚀 Boosts : {count}',
  }[type];
}
