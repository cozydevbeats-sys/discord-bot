import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { getEco } from './balance.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('Déposer ou retirer des pièces de ta banque.')
    .addSubcommand((s) => s.setName('deposit').setDescription('Déposer en banque')
      .addIntegerOption((o) => o.setName('montant').setDescription('Montant (ou "all")').setMinValue(1)))
    .addSubcommand((s) => s.setName('withdraw').setDescription('Retirer de la banque')
      .addIntegerOption((o) => o.setName('montant').setDescription('Montant (ou "all")').setMinValue(1))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const eco = getEco(interaction.guild.id, interaction.user.id);
    const gid = interaction.guild.id;

    if (sub === 'deposit') {
      const amount = interaction.options.getInteger('montant') ?? eco.wallet;
      if (amount <= 0 || amount > eco.wallet) {
        return interaction.reply({ embeds: [embed({ description: `❌ Tu n'as que **${eco.wallet}** 🪙 en poche.`, color: COLORS.error })], ephemeral: true });
      }
      db.prepare('UPDATE economy SET wallet = wallet - ?, bank = bank + ? WHERE guild_id = ? AND user_id = ?').run(amount, amount, gid, interaction.user.id);
      return interaction.reply({ embeds: [embed({ description: `🏦 **${amount}** 🪙 déposés en banque.`, color: COLORS.success })] });
    }

    // withdraw
    const amount = interaction.options.getInteger('montant') ?? eco.bank;
    if (amount <= 0 || amount > eco.bank) {
      return interaction.reply({ embeds: [embed({ description: `❌ Tu n'as que **${eco.bank}** 🪙 en banque.`, color: COLORS.error })], ephemeral: true });
    }
    db.prepare('UPDATE economy SET wallet = wallet + ?, bank = bank - ? WHERE guild_id = ? AND user_id = ?').run(amount, amount, gid, interaction.user.id);
    return interaction.reply({ embeds: [embed({ description: `💵 **${amount}** 🪙 retirés de la banque.`, color: COLORS.success })] });
  },
};
