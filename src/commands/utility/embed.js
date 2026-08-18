import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import { COLOR, embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Créer et poster un embed personnalisé.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('titre').setDescription('Titre de l\'embed').setRequired(true))
    .addStringOption((o) => o.setName('description').setDescription('Texte (utilise \\n pour un saut de ligne)').setRequired(true))
    .addChannelOption((o) => o.setName('salon').setDescription('Salon cible (défaut : ici)').addChannelTypes(ChannelType.GuildText))
    .addStringOption((o) => o.setName('couleur').setDescription('Couleur hex, ex: FF0000'))
    .addStringOption((o) => o.setName('image').setDescription('URL d\'une image'))
    .addStringOption((o) => o.setName('footer').setDescription('Texte du bas')),

  async execute(interaction) {
    const titre = interaction.options.getString('titre');
    const description = interaction.options.getString('description').replaceAll('\\n', '\n');
    const salon = interaction.options.getChannel('salon') || interaction.channel;
    const couleur = interaction.options.getString('couleur');
    const image = interaction.options.getString('image');
    const footer = interaction.options.getString('footer');

    const e = new EmbedBuilder().setTitle(titre).setDescription(description);
    e.setColor(couleur ? parseInt(couleur.replace('#', ''), 16) || COLOR : COLOR);
    if (image) e.setImage(image);
    if (footer) e.setFooter({ text: footer });

    try {
      await salon.send({ embeds: [e] });
      await interaction.reply({ embeds: [embed({ description: `✅ Embed posté dans ${salon}.`, color: COLORS.success })], ephemeral: true });
    } catch {
      await interaction.reply({ embeds: [embed({ description: '❌ Impossible de poster (vérifie l\'URL de l\'image et mes permissions).', color: COLORS.error })], ephemeral: true });
    }
  },
};
