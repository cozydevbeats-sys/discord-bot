import { SlashCommandBuilder } from 'discord.js';
import { getExistingQueue } from '../../utils/musicPlayer.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder().setName('resume').setDescription('Reprendre la musique en pause.'),
  async execute(interaction) {
    const queue = getExistingQueue(interaction.guild.id);
    if (!queue?.current) {
      return interaction.reply({ embeds: [embed({ description: '❌ Aucune musique en pause.', color: COLORS.error })], ephemeral: true });
    }
    queue.player.unpause();
    await interaction.reply({ embeds: [embed({ description: '▶️ Musique reprise.', color: COLORS.success })] });
  },
};
