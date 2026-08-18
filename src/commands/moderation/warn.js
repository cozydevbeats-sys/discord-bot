import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import db, { getGuildConfig } from '../../database/db.js';
import { embed, COLORS, sendLog, addModlog } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertir un membre.')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre à avertir').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison de l\'avertissement').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('membre');
    const reason = interaction.options.getString('raison');

    db.prepare('INSERT INTO warnings (guild_id, user_id, moderator_id, reason, timestamp) VALUES (?, ?, ?, ?, ?)')
      .run(interaction.guild.id, user.id, interaction.user.id, reason, Date.now());
    addModlog(interaction.guild.id, user.id, interaction.user.id, 'warn', reason);

    const count = db.prepare('SELECT COUNT(*) AS c FROM warnings WHERE guild_id = ? AND user_id = ?')
      .get(interaction.guild.id, user.id).c;

    // Sanction automatique si le seuil configuré est atteint pile à ce warn
    let autoActionMsg = '';
    const cfg = getGuildConfig(interaction.guild.id);
    if (cfg.warn_threshold > 0 && count === cfg.warn_threshold) {
      const member = interaction.guild.members.cache.get(user.id);
      if (member?.moderatable) {
        const minutes = cfg.warn_timeout_minutes || 60;
        await member.timeout(minutes * 60_000, `Sanction automatique : ${count} avertissements`).catch(() => {});
        addModlog(interaction.guild.id, user.id, interaction.client.user.id, `timeout auto ${minutes}min`, `${count} avertissements atteints`);
        autoActionMsg = `\n\n⏳ **Sanction automatique appliquée** : timeout de ${minutes} min (seuil de ${count} avertissements atteint).`;
      }
    }

    await interaction.reply({ embeds: [embed({ title: '⚠️ Avertissement', description: `**${user.tag}** a été averti.\n**Raison :** ${reason}\n**Total :** ${count} avertissement(s)${autoActionMsg}`, color: COLORS.warn })] });
    await user.send({ embeds: [embed({ title: `⚠️ Averti sur ${interaction.guild.name}`, description: `**Raison :** ${reason}`, color: COLORS.warn })] }).catch(() => {});
    await sendLog(interaction.guild, { title: '⚠️ Warn', description: `${user.tag} averti par ${interaction.user}.\n**Raison :** ${reason}${autoActionMsg}`, color: COLORS.warn });
  },
};
