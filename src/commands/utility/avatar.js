import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLOR } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Afficher l\'avatar d\'un membre en grand.')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre')),

  async execute(interaction) {
    const user = interaction.options.getUser('membre') || interaction.user;
    const url = user.displayAvatarURL({ size: 1024 });
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(COLOR).setTitle(`Avatar de ${user.username}`).setImage(url).setURL(url)],
    });
  },
};
