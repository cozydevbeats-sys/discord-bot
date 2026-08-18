import { SlashCommandBuilder } from 'discord.js';
import { embed } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Vérifier la latence du bot.'),

  async execute(interaction, client) {
    const sent = await interaction.reply({ embeds: [embed({ description: '🏓 Calcul...' })], fetchReply: true });
    const rtt = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply({ embeds: [embed({
      title: '🏓 Pong !',
      fields: [
        { name: 'Latence message', value: `${rtt} ms`, inline: true },
        { name: 'Latence API', value: `${Math.round(client.ws.ping)} ms`, inline: true },
      ],
    })] });
  },
};
