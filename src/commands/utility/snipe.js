import { SlashCommandBuilder } from 'discord.js';
import { getSnipe } from '../../utils/snipeCache.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Voir le dernier message supprimé dans ce salon.'),

  async execute(interaction) {
    const snipe = getSnipe(interaction.channel.id);
    if (!snipe) {
      return interaction.reply({ embeds: [embed({ description: 'Rien à sniper ici pour le moment.', color: COLORS.info })], ephemeral: true });
    }

    await interaction.reply({ embeds: [embed({
      description: snipe.content || (snipe.hasAttachment ? '*(pièce jointe / média sans texte)*' : '*(contenu vide)*'),
      thumbnail: snipe.authorAvatar,
      footer: `${snipe.authorTag} · supprimé`,
    })] });
  },
};
