import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { getEco } from './balance.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Donner des pièces à un membre.')
    .addUserOption((o) => o.setName('membre').setDescription('Le destinataire').setRequired(true))
    .addIntegerOption((o) => o.setName('montant').setDescription('Montant à donner').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    const target = interaction.options.getUser('membre');
    const amount = interaction.options.getInteger('montant');

    if (target.bot || target.id === interaction.user.id) {
      return interaction.reply({ embeds: [embed({ description: '❌ Destinataire invalide.', color: COLORS.error })], ephemeral: true });
    }

    const eco = getEco(interaction.guild.id, interaction.user.id);
    if (eco.wallet < amount) {
      return interaction.reply({ embeds: [embed({ description: `❌ Tu n'as que **${eco.wallet}** 🪙 en poche.`, color: COLORS.error })], ephemeral: true });
    }

    getEco(interaction.guild.id, target.id); // garantit la ligne
    db.prepare('UPDATE economy SET wallet = wallet - ? WHERE guild_id = ? AND user_id = ?').run(amount, interaction.guild.id, interaction.user.id);
    db.prepare('UPDATE economy SET wallet = wallet + ? WHERE guild_id = ? AND user_id = ?').run(amount, interaction.guild.id, target.id);

    await interaction.reply({ embeds: [embed({ description: `💸 ${interaction.user} a donné **${amount}** 🪙 à ${target} !`, color: COLORS.success })] });
  },
};
