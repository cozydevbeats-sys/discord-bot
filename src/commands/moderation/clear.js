import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { embed, COLORS, sendLog } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprimer un nombre de messages dans le salon.')
    .addIntegerOption((o) => o.setName('nombre').setDescription('Nombre de messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((o) => o.setName('membre').setDescription('Ne supprimer que les messages de ce membre'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('nombre');
    const target = interaction.options.getUser('membre');
    await interaction.deferReply({ ephemeral: true });

    let messages = await interaction.channel.messages.fetch({ limit: 100 });
    // Discord ne peut supprimer en masse que les messages < 14 jours
    const twoWeeks = Date.now() - 14 * 24 * 60 * 60 * 1000;
    messages = messages.filter((m) => m.createdTimestamp > twoWeeks);
    if (target) messages = messages.filter((m) => m.author.id === target.id);

    const toDelete = [...messages.values()].slice(0, amount);
    const deleted = await interaction.channel.bulkDelete(toDelete, true);

    await interaction.editReply({ embeds: [embed({ description: `🧹 **${deleted.size}** message(s) supprimé(s).`, color: COLORS.success })] });
    await sendLog(interaction.guild, { title: '🧹 Clear', description: `${deleted.size} message(s) supprimés dans ${interaction.channel} par ${interaction.user}.`, color: COLORS.info });
  },
};
