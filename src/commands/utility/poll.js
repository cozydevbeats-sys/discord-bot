import { SlashCommandBuilder } from 'discord.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Créer un sondage (jusqu\'à 4 options, ou oui/non).')
    .addStringOption((o) => o.setName('question').setDescription('La question').setRequired(true))
    .addStringOption((o) => o.setName('option1').setDescription('Option 1'))
    .addStringOption((o) => o.setName('option2').setDescription('Option 2'))
    .addStringOption((o) => o.setName('option3').setDescription('Option 3'))
    .addStringOption((o) => o.setName('option4').setDescription('Option 4')),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    const options = [];
    for (let i = 1; i <= 4; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }

    let description;
    let reactions;
    if (options.length === 0) {
      description = `**${question}**`;
      reactions = ['👍', '👎'];
    } else {
      description = `**${question}**\n\n${options.map((o, i) => `${emojis[i]} ${o}`).join('\n')}`;
      reactions = emojis.slice(0, options.length);
    }

    await interaction.reply({ embeds: [embed({ title: '📊 Sondage', description, color: COLORS.info, footer: `Lancé par ${interaction.user.username}` })] });
    const msg = await interaction.fetchReply();
    for (const r of reactions) await msg.react(r);
  },
};
