import { SlashCommandBuilder } from 'discord.js';
import { getExistingQueue } from '../../utils/musicPlayer.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Régler le mode de répétition.')
    .addStringOption((o) => o.setName('mode').setDescription('Mode de répétition').setRequired(true)
      .addChoices(
        { name: 'Désactivée', value: 'off' },
        { name: 'Piste actuelle', value: 'track' },
        { name: 'File entière', value: 'queue' },
      )),
  async execute(interaction) {
    const q = getExistingQueue(interaction.guild.id);
    if (!q) {
      return interaction.reply({ embeds: [embed({ description: '❌ Aucune musique active.', color: COLORS.error })], ephemeral: true });
    }
    q.loopMode = interaction.options.getString('mode');
    const labels = { off: 'désactivée', track: 'piste actuelle 🔂', queue: 'file entière 🔁' };
    await interaction.reply({ embeds: [embed({ description: `🔁 Répétition : **${labels[q.loopMode]}**.`, color: COLORS.success })] });
  },
};
