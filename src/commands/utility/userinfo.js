import { SlashCommandBuilder } from 'discord.js';
import { embed } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Informations sur un membre.')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre')),

  async execute(interaction) {
    const user = interaction.options.getUser('membre') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);

    const roles = member
      ? member.roles.cache.filter((r) => r.id !== interaction.guild.id).map((r) => r).slice(0, 15).join(' ') || 'Aucun'
      : 'Aucun';

    await interaction.reply({ embeds: [embed({
      title: `👤 ${user.tag}`,
      thumbnail: user.displayAvatarURL(),
      fields: [
        { name: 'ID', value: user.id, inline: true },
        { name: 'Bot', value: user.bot ? 'Oui' : 'Non', inline: true },
        { name: 'Compte créé', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false },
        ...(member ? [{ name: 'A rejoint', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: false }] : []),
        { name: `Rôles (${member?.roles.cache.size - 1 || 0})`, value: roles, inline: false },
      ],
    })] });
  },
};
