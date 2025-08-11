const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { Skill, Boss } = require('@wise-old-man/utils');
const { WOMClient } = require('@wise-old-man/utils');
const { getInfoConfig } = require('../../utils/handlers/configHelper');
const womClient = new WOMClient();

const skillMetrics = Object.values(Skill);
const bossMetrics = Object.values(Boss);
const ENTRIES_TO_SHOW = 10;

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Show top 10 for a given WOM metric')
    .addSubcommand(sub =>
      sub
        .setName('skill')
        .setDescription('Top 10 for a skill metric')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Choose a skill')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('boss')
        .setDescription('Top 10 for a boss metric')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Choose a boss')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async autocomplete(interaction) {
    // await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const focused = interaction.options.getFocused();
    const sub = interaction.options.getSubcommand();
    const source = sub === 'skill' ? skillMetrics : bossMetrics;

    const filtered = source.filter(m =>
      m.toLowerCase().includes(focused.toLowerCase())
    );

    await interaction.respond(
      filtered.slice(0, 25).map(m => ({
        name: m.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
        value: m
      }))
    );
  },

  async execute(interaction) {
    await interaction.deferReply();

    const { guildId, client, options } = interaction;
    const { groupId } = await getInfoConfig();

    if (!groupId) {
      return interaction.editReply('❌ Group ID not configured for this server.');
    }

    // const sub = options.getSubcommand();
    const metric = options.getString('name');

    try {
      const hiscores = await womClient.groups.getGroupHiscores(groupId, metric, { limit: ENTRIES_TO_SHOW });

      //const entries = hiscores.map((entry, i) =>
      //   `**${i + 1}.** ${entry.player.displayName} — \`${entry.value}\``
      //);

      //const entries = hiscores.map((entry, i) => {
      //   const name = entry.player?.displayName || 'Unknown';
      //   const value = entry.data?.kills ?? entry.data?.ehp ?? 0;
      //   const formatted = typeof value === 'number' ? value.toLocaleString() : '0';
      //   return `**${i + 1}.** ${name} — \`${formatted}\``;
      //});

      const entries = hiscores.map((entry, i) => {
        const name = entry.player?.displayName || 'Unknown';
        const type = entry.data?.type;

        let value;
        if (type === 'skill') {
          value = entry.data.experience;
        } else if (type === 'boss') {
          value = entry.data.kills;
        } else {
          value = 0;
        }

        const formatted = typeof value === 'number' ? value.toLocaleString() : '0';
        return `**${i + 1}.** ${name} — \`${formatted}\``;
      });


      function formatMetricName(metric) {
        return metric
          .toLowerCase()
          .replace(/_/g, ' ')
          .replace(/\b\w/g, char => char.toUpperCase());
      }

      const embed = new EmbedBuilder()
        .setTitle(`Top 10: ${formatMetricName(metric)}`)
        .setDescription(entries.join('\n') || '*No data available*')
        .setColor(0x3498db)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('❌ Error fetching hiscores:', err);
      await interaction.editReply('❌ Failed to retrieve data from Wise Old Man.');
    }
  }
};
