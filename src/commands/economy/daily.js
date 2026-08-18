import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { getEco } from './balance.js';
import { embed, COLORS } from '../../utils/helpers.js';

const DAY = 24 * 60 * 60 * 1000;
const REWARD = 250;

export default {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Récupérer ta récompense quotidienne.'),

  async execute(interaction) {
    const eco = getEco(interaction.guild.id, interaction.user.id);
    const now = Date.now();

    if (now - eco.last_daily < DAY) {
      const next = eco.last_daily + DAY;
      return interaction.reply({ embeds: [embed({ description: `⏳ Déjà récupéré ! Reviens <t:${Math.floor(next / 1000)}:R>.`, color: COLORS.warn })], ephemeral: true });
    }

    db.prepare('UPDATE economy SET wallet = wallet + ?, last_daily = ? WHERE guild_id = ? AND user_id = ?')
      .run(REWARD, now, interaction.guild.id, interaction.user.id);

    await interaction.reply({ embeds: [embed({ description: `✅ Tu as reçu **${REWARD}** 🪙 !`, color: COLORS.success })] });
  },
};
