import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../../database/db.js';
import { embed, COLORS } from '../../utils/helpers.js';
import { getSpecies } from '../../data/pokedex.js';

export default {
  data: new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Échanger un Pokémon avec un autre dresseur.')
    .addSubcommand((s) => s.setName('offer').setDescription('Proposer un échange 1 contre 1')
      .addUserOption((o) => o.setName('partenaire').setDescription('Avec qui échanger').setRequired(true))
      .addIntegerOption((o) => o.setName('mon_pokemon').setDescription('ID de TON Pokémon à donner (via /pokemon list)').setRequired(true))
      .addIntegerOption((o) => o.setName('son_pokemon').setDescription('ID du Pokémon que tu veux en échange').setRequired(true)))
    .addSubcommand((s) => s.setName('cancel').setDescription('Annuler ta proposition en attente')
      .addIntegerOption((o) => o.setName('id').setDescription('ID de l\'échange').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'cancel') {
      const id = interaction.options.getInteger('id');
      const info = db.prepare('DELETE FROM trades WHERE id = ? AND guild_id = ? AND from_user = ? AND status = ?')
        .run(id, gid, interaction.user.id, 'pending');
      if (info.changes === 0) return interaction.reply({ embeds: [embed({ description: '❌ Échange introuvable ou déjà traité.', color: COLORS.error })], ephemeral: true });
      return interaction.reply({ embeds: [embed({ description: `🗑️ Proposition #${id} annulée.`, color: COLORS.success })], ephemeral: true });
    }

    // offer
    const partner = interaction.options.getUser('partenaire');
    const myMonId = interaction.options.getInteger('mon_pokemon');
    const theirMonId = interaction.options.getInteger('son_pokemon');

    if (partner.bot || partner.id === interaction.user.id) {
      return interaction.reply({ embeds: [embed({ description: '❌ Choisis un autre dresseur.', color: COLORS.error })], ephemeral: true });
    }

    const myMon = db.prepare('SELECT * FROM user_pokemon WHERE id = ? AND guild_id = ? AND user_id = ?').get(myMonId, gid, interaction.user.id);
    if (!myMon) return interaction.reply({ embeds: [embed({ description: '❌ Ce Pokémon ne t\'appartient pas.', color: COLORS.error })], ephemeral: true });

    const theirMon = db.prepare('SELECT * FROM user_pokemon WHERE id = ? AND guild_id = ? AND user_id = ?').get(theirMonId, gid, partner.id);
    if (!theirMon) return interaction.reply({ embeds: [embed({ description: `❌ ${partner.username} ne possède pas ce Pokémon.`, color: COLORS.error })], ephemeral: true });

    const info = db.prepare('INSERT INTO trades (guild_id, from_user, to_user, from_pokemon_id, to_pokemon_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(gid, interaction.user.id, partner.id, myMonId, theirMonId, 'pending', Date.now());
    const tradeId = info.lastInsertRowid;

    const mySpecies = getSpecies(myMon.species_id);
    const theirSpecies = getSpecies(theirMon.species_id);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`trade:accept:${tradeId}`).setLabel('Accepter').setEmoji('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`trade:decline:${tradeId}`).setLabel('Refuser').setEmoji('❌').setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({
      content: `${partner}`,
      embeds: [embed({
        title: '🔄 Proposition d\'échange',
        description: `${interaction.user} propose :\n**${myMon.nickname || mySpecies.name}** (Nv.${myMon.level})\n\ncontre\n\n**${theirMon.nickname || theirSpecies.name}** (Nv.${theirMon.level}) de ${partner}.`,
        color: COLORS.info,
        footer: `Échange #${tradeId}`,
      })],
      components: [row],
    });
  },
};
