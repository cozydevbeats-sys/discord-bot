import { SlashCommandBuilder } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Te marquer comme absent (AFK).')
    .addStringOption((o) => o.setName('raison').setDescription('Raison de ton absence')),

  async execute(interaction) {
    const reason = interaction.options.getString('raison') || 'AFK';
    db.prepare('INSERT INTO afk (guild_id, user_id, reason, since) VALUES (?, ?, ?, ?) ON CONFLICT(guild_id, user_id) DO UPDATE SET reason = excluded.reason, since = excluded.since')
      .run(interaction.guild.id, interaction.user.id, reason, Date.now());
    await interaction.reply({ embeds: [embed({ description: `💤 Tu es maintenant AFK : ${reason}`, color: COLORS.info })] });
  },
};
