import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { getEco } from './balance.js';
import { embed, COLORS } from '../../utils/helpers.js';

const COOLDOWN = 60 * 60 * 1000; // 1h
const JOBS = [
  'Tu as livré des pizzas', 'Tu as codé un script FiveM', 'Tu as réparé une voiture',
  'Tu as fait un stream', 'Tu as vendu des NFT de cailloux', 'Tu as promené des chiens',
  'Tu as chanté du Kaamelott dans le métro',
];

export default {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Travailler pour gagner des pièces.'),

  async execute(interaction) {
    const eco = getEco(interaction.guild.id, interaction.user.id);
    const now = Date.now();

    if (now - eco.last_work < COOLDOWN) {
      const next = eco.last_work + COOLDOWN;
      return interaction.reply({ embeds: [embed({ description: `⏳ Tu es épuisé. Reviens bosser <t:${Math.floor(next / 1000)}:R>.`, color: COLORS.warn })], ephemeral: true });
    }

    const earned = Math.floor(Math.random() * 151) + 50; // 50–200
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];

    db.prepare('UPDATE economy SET wallet = wallet + ?, last_work = ? WHERE guild_id = ? AND user_id = ?')
      .run(earned, now, interaction.guild.id, interaction.user.id);

    await interaction.reply({ embeds: [embed({ description: `💼 ${job} et gagné **${earned}** 🪙 !`, color: COLORS.success })] });
  },
};
