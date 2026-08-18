import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { getEco } from './balance.js';
import { embed, COLORS } from '../../utils/helpers.js';

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎'];

export default {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Machine à sous : mise tes pièces et tente ta chance.')
    .addIntegerOption((o) => o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10)),

  async execute(interaction) {
    const bet = interaction.options.getInteger('mise');
    const eco = getEco(interaction.guild.id, interaction.user.id);
    const gid = interaction.guild.id;

    if (eco.wallet < bet) {
      return interaction.reply({ embeds: [embed({ description: `❌ Tu n'as que **${eco.wallet}** 🪙 en poche.`, color: COLORS.error })], ephemeral: true });
    }

    const spin = Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    let multiplier = 0;
    if (spin[0] === spin[1] && spin[1] === spin[2]) {
      multiplier = spin[0] === '💎' ? 10 : 5;      // trois identiques
    } else if (spin[0] === spin[1] || spin[1] === spin[2] || spin[0] === spin[2]) {
      multiplier = 2;                                // deux identiques
    }

    const net = multiplier > 0 ? bet * multiplier - bet : -bet;
    db.prepare('UPDATE economy SET wallet = wallet + ? WHERE guild_id = ? AND user_id = ?').run(net, gid, interaction.user.id);

    const result = multiplier > 0
      ? `🎉 **Gagné !** +${bet * multiplier - bet} 🪙 (x${multiplier})`
      : `💀 **Perdu.** -${bet} 🪙`;

    await interaction.reply({ embeds: [embed({
      title: '🎰 Machine à sous',
      description: `${spin.join(' | ')}\n\n${result}\n**Solde :** ${eco.wallet + net} 🪙`,
      color: multiplier > 0 ? COLORS.success : COLORS.error,
    })] });
  },
};
