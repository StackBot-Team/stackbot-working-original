const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { createWOMSkillEvent } = require('../../utils/weeklyEvents/womSotw.js');
const { createDiscordSkillEvent } = require('../../utils/weeklyEvents/discordSotw.js');
const { Skill } = require('@wise-old-man/utils');
const { WOMClient } = require('@wise-old-man/utils');
const { getExistingCompetitions } = require('../../utils/weeklyEvents/getExistingCompetition.js');
const { getInfoConfig } = require('../../utils/handlers/configHelper.js');
require('dotenv').config();
const { MAINTENANCE_MODE, VERIFICATION_CODE } = process.env;

const womClient = new WOMClient();
//const maintenanceMode = true;

const skillMetrics = Object.values(Skill);

async function checkForActiveSkillCompetition(groupId, skill) {
  try {

    const competitions = await womClient.groups.getGroupCompetitions(groupId, { limit: 50 });

    const activeCompetition = competitions.find(comp => comp.metric === skill.toUpperCase());
    return activeCompetition;
  } catch (error) {
    console.error('Error fetching active competitions:', error);
    return null;
  }
}

async function selectRandomSkill(groupId) {
  let randomSkill;
  let activeCompetition;
  do {
    randomSkill = skillMetrics[Math.floor(Math.random() * skillMetrics.length)];
    activeCompetition = await checkForActiveSkillCompetition(groupId, randomSkill);
  } while (activeCompetition);
  return randomSkill;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-skill-event')
    .setDescription('Creates a SOTW Wise Old Man competition and Discord event')
    .addSubcommand(subcommand =>
      subcommand
        .setName('random')
        .setDescription('Create an event with a random skill')
      // .addStringOption(option =>
      //   option
      //     .setName('verification')
      //     .setDescription('Enter your verification code')
      //     .setRequired(true)
      // )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName('choose')
        .setDescription('Create an event with a chosen skill')
        // .addStringOption(option =>
        //   option
        //     .setName('verification')
        //     .setDescription('Enter your verification code')
        //     .setRequired(true)
        // )
        .addStringOption(option =>
          option
            .setName('skill')
            .setDescription('Select a skill')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async execute(interaction) {

    const { groupId } = await getInfoConfig();
    // uncomment verificaetion option and here to require user input
    //const verificationCode = interaction.options.getString('verification');

    await interaction.deferReply({ ephemeral: false });
    try {
      // Check for existing competitions
      const existingCompetitions = await getExistingCompetitions(groupId, 'skill');
      if (existingCompetitions.length > 0) {
        // Inform the user about the existing competition
        const competition = existingCompetitions[0];
        const existingCompetitionEmbed = new EmbedBuilder()
          .setTitle("Existing SOTW Competition")
          .setDescription(`A Skill of the Week competition is already active!`)
          .addFields(
            { name: "Skill", value: competition.metric.toUpperCase(), inline: false },
            { name: "Start Time", value: `<t:${Math.floor(new Date(competition.startsAt).getTime() / 1000)}:F>`, inline: true },
            { name: "End Time", value: `<t:${Math.floor(new Date(competition.endsAt).getTime() / 1000)}:F>`, inline: true }
          )
          .setColor(0xffcc00);

        await interaction.editReply({ embeds: [existingCompetitionEmbed], ephemeral: false });
        return;
      }

      let selectedSkill;
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'random') {
        selectedSkill = await selectRandomSkill(groupId);
      } else if (subcommand === 'choose') {

        const skillInput = interaction.options.getString('skill');
        const normalizedInput = skillInput.trim().toUpperCase().replace(/ /g, '_');
        const matchedSkill = skillMetrics.find(skill => skill.toUpperCase() === normalizedInput);

        if (!matchedSkill) {
          await interaction.editReply({
            content: `Invalid skill name.`
          });
          return;
        }

        const activeCompetition = await checkForActiveSkillCompetition(groupId, matchedSkill);
        if (activeCompetition) {
          await interaction.editReply({ content: `A competition for ${matchedSkill.replace(/_/g, ' ')} is already active!` });
          return;
        }
        selectedSkill = matchedSkill;
      }

      // Create a wom comp
      const resultWOM = await createWOMSkillEvent(groupId, VERIFICATION_CODE, selectedSkill);
      if (!resultWOM.success) {
        throw new Error(`Failed to create Wise Old Man competition: ${resultWOM.error}`);
      }

      // Create a discord event
      const guild = interaction.guild;
      const resultDiscord = await createDiscordSkillEvent(guild, selectedSkill, groupId);
      if (!resultDiscord.success) {
        throw new Error(`Failed to create Discord event: ${resultDiscord.error}`);
      }

      const successEmbed = new EmbedBuilder()
        .setTitle("SOTW Competition Created Successfully!")
        .addFields(
          { name: "Skill", value: selectedSkill.toUpperCase(), inline: false },
          { name: "Start Time", value: `<t:${Math.floor(new Date(resultWOM.data.startsAt).getTime() / 1000)}:F>`, inline: true },
          { name: "End Time", value: `<t:${Math.floor(new Date(resultWOM.data.endsAt).getTime() / 1000)}:F>`, inline: true }
        )
        .setColor(0x00ff00);

      await interaction.editReply({ embeds: [successEmbed], ephemeral: false });

    } catch (error) {
      console.error('Error executing command:', error);
      await interaction.editReply({ content: `An error occurred: ${error.message}` });
    }
  },
};
