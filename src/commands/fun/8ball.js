import { SlashCommandBuilder } from 'discord.js';
import { embed, COLORS } from '../../utils/helpers.js';

const ANSWERS = [
  'C\'est certain.', 'Sans aucun doute.', 'Oui, absolument.', 'Tu peux compter dessus.',
  'Probablement.', 'Les signes indiquent que oui.', 'C\'est flou, réessaie.',
  'Demande plus tard.', 'Mieux vaut ne pas te le dire maintenant.', 'Impossible à prédire.',
  'N\'y compte pas trop.', 'Ma réponse est non.', 'Mes sources disent non.', 'Très douteux.',
];

export default {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Poser une question à la boule magique.')
    .addStringOption((o) => o.setName('question').setDescription('Ta question').setRequired(true)),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    await interaction.reply({ embeds: [embed({
      title: '🎱 Boule magique',
      description: `**Question :** ${question}\n**Réponse :** ${answer}`,
      color: COLORS.info,
    })] });
  },
};
