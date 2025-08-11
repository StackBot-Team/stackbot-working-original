const { SlashCommandBuilder } = require('discord.js');
const { WOMClient, Boss, Skill, Activity } = require('@wise-old-man/utils');
const fsPromises = require('fs').promises;
const path = require('path');
const getPlayerStats = require('../../utils/handlers/getPlayerStats.js');

const dataPath = path.join(__dirname, '../../data/output.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription('Get your player details from the Wise Old Man API')
    .addSubcommand(subcommand =>
      subcommand
        .setName('skills')
        .setDescription('View skill metrics')
        .addStringOption(option =>
          option
            .setName('metric')
            .setDescription('Select a skill metric')
            .setAutocomplete(true)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('bosses')
        .setDescription('View boss metrics')
        .addStringOption(option =>
          option
            .setName('metric')
            .setDescription('Select a boss metric')
            .setAutocomplete(true)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('activities')
        .setDescription('View activity metrics')
        .addStringOption(option =>
          option
            .setName('metric')
            .setDescription('Select an activity metric')
            .setAutocomplete(true)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('combat')
        .setDescription('View combat stats')
    ),

  async execute(interaction) {
    await interaction.deferReply();


    let playerData = {};
    try {

      await fsPromises.access(dataPath);
      const fileData = await fsPromises.readFile(dataPath, 'utf-8');
      playerData = JSON.parse(fileData);
    } catch (err) {
      console.error('Error reading player data:', err);

      playerData = {};
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand !== 'combat') {
      const metric = interaction.options.getString('metric');
      const discordId = interaction.user.id;
      let playerId = null;
      for (const key in playerData) {
        if (playerData[key].discordId === discordId) {
          playerId = key;
          break;
        }
      }
      if (!playerId) {
        return interaction.editReply("Your player data wasn't found. Please register first.");
      }

      const womClient = new WOMClient();
      try {
        const playerDetails = await womClient.players.getPlayerDetailsById(parseInt(playerId));
        const latestData = playerDetails.latestSnapshot.data;

        let responseData;
        if (subcommand === 'skills') {
          responseData = latestData.skills[metric];
        } else if (subcommand === 'bosses') {
          responseData = latestData.bosses[metric];
        } else if (subcommand === 'activities') {
          responseData = latestData.activities[metric];
        }
        if (!responseData) {
          return interaction.editReply(`Metric \`${metric}\` not found for ${subcommand}.`);
        }
        return interaction.editReply(
          `**${subcommand.toUpperCase()}** \`${metric}\` details:\n\`\`\`json\n${JSON.stringify(responseData, null, 2)}\n\`\`\``
        );
      } catch (error) {
        console.error(error);
        return interaction.editReply("There was an error fetching your player details.");
      }
    } else {
      return await getPlayerStats.execute(interaction);
    }
  },

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const subcommand = interaction.options.getSubcommand();
    let choices = [];

    if (subcommand === 'bosses') {
      choices = Object.values(Boss);
    } else if (subcommand === 'skills') {
      choices = Object.values(Skill);
    } else if (subcommand === 'activities') {
      choices = Object.values(Activity);
    }

    const filtered = choices.filter(choice =>
      choice.replace(/_/g, ' ').toLowerCase().includes(focusedOption.value.toLowerCase())
    );

    await interaction.respond(
      filtered.slice(0, 25).map(metric => ({
        name: metric.replace(/_/g, ' '),
        value: metric,
      }))
    );
  }
};
