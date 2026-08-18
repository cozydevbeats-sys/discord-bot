import { SlashCommandBuilder } from 'discord.js';
import { embed } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Informations sur le serveur.'),

  async execute(interaction) {
    const g = interaction.guild;
    const owner = await g.fetchOwner();

    await interaction.reply({ embeds: [embed({
      title: `📋 ${g.name}`,
      thumbnail: g.iconURL(),
      fields: [
        { name: 'Propriétaire', value: `${owner.user.tag}`, inline: true },
        { name: 'Membres', value: `${g.memberCount}`, inline: true },
        { name: 'Salons', value: `${g.channels.cache.size}`, inline: true },
        { name: 'Rôles', value: `${g.roles.cache.size}`, inline: true },
        { name: 'Boosts', value: `${g.premiumSubscriptionCount || 0}`, inline: true },
        { name: 'Créé le', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
      ],
      footer: `ID: ${g.id}`,
    })] });
  },
};
