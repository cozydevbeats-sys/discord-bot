import { SlashCommandBuilder } from 'discord.js';
import { embed, COLORS } from '../../utils/helpers.js';

const EMOJI = { pierre: '🪨', feuille: '📄', ciseaux: '✂️' };
const BEATS = { pierre: 'ciseaux', feuille: 'pierre', ciseaux: 'feuille' };

export default {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Pierre, feuille, ciseaux contre le bot.')
    .addStringOption((o) => o.setName('choix').setDescription('Ton choix').setRequired(true)
      .addChoices({ name: 'Pierre', value: 'pierre' }, { name: 'Feuille', value: 'feuille' }, { name: 'Ciseaux', value: 'ciseaux' })),

  async execute(interaction) {
    const player = interaction.options.getString('choix');
    const options = ['pierre', 'feuille', 'ciseaux'];
    const bot = options[Math.floor(Math.random() * 3)];

    let result;
    let color;
    if (player === bot) { result = 'Égalité ! 🤝'; color = COLORS.warn; }
    else if (BEATS[player] === bot) { result = 'Tu gagnes ! 🎉'; color = COLORS.success; }
    else { result = 'Tu perds ! 😈'; color = COLORS.error; }

    await interaction.reply({ embeds: [embed({
      title: 'Pierre · Feuille · Ciseaux',
      description: `Toi : ${EMOJI[player]} **${player}**\nMoi : ${EMOJI[bot]} **${bot}**\n\n**${result}**`,
      color,
    })] });
  },
};
