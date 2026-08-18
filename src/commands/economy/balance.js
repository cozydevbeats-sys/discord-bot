import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export function getEco(guildId, userId) {
  let row = db.prepare('SELECT * FROM economy WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  if (!row) {
    db.prepare('INSERT INTO economy (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
    row = db.prepare('SELECT * FROM economy WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  }
  return row;
}

export default {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Voir ton porte-monnaie (ou celui d\'un autre).')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre')),

  async execute(interaction) {
    const user = interaction.options.getUser('membre') || interaction.user;
    const eco = getEco(interaction.guild.id, user.id);
    await interaction.reply({ embeds: [embed({
      title: `💰 Solde de ${user.username}`,
      color: COLORS.success,
      fields: [
        { name: 'Poche', value: `${eco.wallet} 🪙`, inline: true },
        { name: 'Banque', value: `${eco.bank} 🪙`, inline: true },
        { name: 'Total', value: `${eco.wallet + eco.bank} 🪙`, inline: true },
      ],
    })] });
  },
};
