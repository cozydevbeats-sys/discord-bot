import { SlashCommandBuilder } from 'discord.js';
import { getExistingQueue } from '../../utils/musicPlayer.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder().setName('skip').setDescription('Passer à la musique suivante.'),
  async execute(interaction) {
    const queue = getExistingQueue(interaction.guild.id);
    if (!queue || !queue.current) {
      return interaction.reply({ embeds: [embed({ description: '❌ Aucune musique en cours.', color: COLORS.error })], ephemeral: true });
    }
    const skipped = queue.current.title;
    queue.skip();
    await interaction.reply({ embeds: [embed({ description: `⏭️ **${skipped}** passée.`, color: COLORS.success })] });
  },
};
