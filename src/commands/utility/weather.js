import { SlashCommandBuilder } from 'discord.js';
import { embed, COLORS } from '../../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Voir la météo actuelle d\'une ville.')
    .addStringOption((o) => o.setName('ville').setDescription('Nom de la ville').setRequired(true)),

  async execute(interaction) {
    const city = interaction.options.getString('ville');
    await interaction.deferReply();

    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=fr`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const current = data.current_condition?.[0];
      const area = data.nearest_area?.[0];
      if (!current || !area) throw new Error('Réponse inattendue du service météo');

      const placeName = `${area.areaName?.[0]?.value || city}, ${area.country?.[0]?.value || ''}`.trim();
      const description = current.lang_fr?.[0]?.value || current.weatherDesc?.[0]?.value || '—';

      await interaction.editReply({ embeds: [embed({
        title: `🌤️ Météo à ${placeName}`,
        fields: [
          { name: 'Température', value: `${current.temp_C}°C (ressenti ${current.FeelsLikeC}°C)`, inline: true },
          { name: 'Conditions', value: description, inline: true },
          { name: 'Humidité', value: `${current.humidity}%`, inline: true },
          { name: 'Vent', value: `${current.windspeedKmph} km/h`, inline: true },
          { name: 'Nuages', value: `${current.cloudcover}%`, inline: true },
          { name: 'Précipitations', value: `${current.precipMM} mm`, inline: true },
        ],
        footer: 'Données : wttr.in',
      })] });
    } catch (err) {
      console.error('[weather]', err.message);
      await interaction.editReply({ embeds: [embed({ description: '❌ Ville introuvable ou service météo indisponible, réessaie plus tard.', color: COLORS.error })] });
    }
  },
};
