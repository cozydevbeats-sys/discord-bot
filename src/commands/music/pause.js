import { SlashCommandBuilder } from 'discord.js';
import { getExistingQueue } from '../../utils/musicPlayer.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder().setName('pause').setDescription('Mettre la musique en pause.'),
  async execute(interaction) {
    const queue = getExistingQueue(interaction.guild.id);
    if (!queue?.current) {
      return interaction.reply({ embeds: [embed({ description: '❌ Aucune musique en cours.', color: COLORS.error })], ephemeral: true });
    }
    queue.player.pause();
    await interaction.reply({ embeds: [embed({ description: '⏸️ Musique en pause.', color: COLORS.info })] });
  },
};
