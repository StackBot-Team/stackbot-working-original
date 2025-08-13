const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { createWOMBossEvent } = require('../../utils/weeklyEvents/womBotw.js');
const { createDiscordBossEvent } = require('../../utils/weeklyEvents/discordBotw.js');
const { Boss } = require('@wise-old-man/utils');
const { WOMClient } = require('@wise-old-man/utils');
const { getExistingCompetitions } = require('../../utils/weeklyEvents/getExistingCompetition.js');
const fs = require('fs').promises;
const path = require('path');
const { getInfoConfig } = require('../../utils/handlers/configHelper.js');
require('dotenv').config();
const { MAINTENANCE_MODE, VERIFICATION_CODE } = process.env;


const manageBosses = require('../../utils/weeklyEvents/manageBosses.js');

const womClient = new WOMClient();
const bossMetrics = Object.values(Boss);


async function checkForActiveBossCompetition(groupId, boss) {
   try {
      const competitions = await womClient.groups.getGroupCompetitions(groupId, { limit: 50 });
      return competitions.find(comp => comp.metric === boss.toUpperCase());
   } catch (error) {
      console.error('Error fetching active competitions:', error);
      return null;
   }
}

async function selectRandomBoss(groupId) {
   const excludedBossesPath = path.join(__dirname, '../../data/excludedBosses.json');
   const excludedBosses = JSON.parse(await fs.readFile(excludedBossesPath, 'utf8'));
   const filteredBossMetrics = bossMetrics.filter(boss => !excludedBosses.includes(boss));

   let randomBoss;
   let activeCompetition;
   do {
      randomBoss = filteredBossMetrics[Math.floor(Math.random() * filteredBossMetrics.length)];
      activeCompetition = await checkForActiveBossCompetition(groupId, randomBoss);
   } while (activeCompetition);

   return randomBoss;
}

module.exports = {
   data: new SlashCommandBuilder()
      .setName('create-boss-event')
      .setDescription('Creates a BOTW Wise Old Man competition and Discord event')
      .addSubcommand(subcommand =>
         subcommand
            .setName('random')
            .setDescription('Create an event with a random boss')
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
            .setDescription('Create an event with a chosen boss')
            // .addStringOption(option =>
            //   option
            //     .setName('verification')
            //     .setDescription('Enter your verification code')
            //     .setRequired(true)
            // )
            .addStringOption(option =>
               option
                  .setName('boss')
                  .setDescription('Select a boss')
                  .setRequired(true)
                  .setAutocomplete(true)
            )
      )
      .addSubcommand(subcommand =>
         subcommand
            .setName('manage')
            .setDescription('Manage BOTW boss configuration')
      ),

   async execute(interaction) {
      const subcommand = interaction.options.getSubcommand();
      if (subcommand === 'manage') {
         await manageBosses.execute(interaction);
         return;
      }

      const { groupId } = await getInfoConfig();
      //const verificationCode = interaction.options.getString('verification');

      await interaction.deferReply({ ephemeral: false });
      try {
         // Check if boss competition is already active
         const existingCompetitions = await getExistingCompetitions(groupId, 'boss');
         if (existingCompetitions.length > 0) {
            const competition = existingCompetitions[0];
            const prettyBossName = competition.metric.replace(/_/g, " ");
            const existingCompetitionEmbed = new EmbedBuilder()
               .setTitle("Existing BOTW Competition")
               .setDescription(`A Boss of the Week competition is already active!`)
               .addFields(
                  { name: "Boss", value: prettyBossName.toUpperCase(), inline: false },
                  { name: "Start Time", value: `<t:${Math.floor(new Date(competition.startsAt).getTime() / 1000)}:F>`, inline: true },
                  { name: "End Time", value: `<t:${Math.floor(new Date(competition.endsAt).getTime() / 1000)}:F>`, inline: true }
               )
               .setColor(0xffcc00);
            await interaction.editReply({ embeds: [existingCompetitionEmbed], ephemeral: false });
            return;
         }

         let selectedBoss;
         if (subcommand === 'random') {
            selectedBoss = await selectRandomBoss(groupId);
         } else if (subcommand === 'choose') {

            const bossInput = interaction.options.getString('boss');
            const normalizedInput = bossInput.trim().toUpperCase().replace(/ /g, '_');
            const matchedBoss = bossMetrics.find(boss => boss.toUpperCase() === normalizedInput);

            if (!matchedBoss) {
               await interaction.editReply({
                  content: `Invalid boss name.`
               });
               return;
            }

            const activeCompetition = await checkForActiveBossCompetition(groupId, matchedBoss);
            if (activeCompetition) {
               await interaction.editReply({ content: `A competition for ${matchedBoss.replace(/_/g, ' ')} is already active!` });
               return;
            }
            selectedBoss = matchedBoss;
         }

         const resultWOM = await createWOMBossEvent(groupId, VERIFICATION_CODE, selectedBoss);
         if (!resultWOM.success) {
            throw new Error(`Failed to create Wise Old Man competition: ${resultWOM.error}`);
         }

         const guild = interaction.guild;
         const resultDiscord = await createDiscordBossEvent(guild, selectedBoss, groupId);
         if (!resultDiscord.success) {
            throw new Error(`Failed to create Discord event: ${resultDiscord.error}`);
         }

         const prettyBossName = selectedBoss.replace(/_/g, " ");
         const successEmbed = new EmbedBuilder()
            .setTitle("BOTW Competition Created Successfully!")
            .addFields(
               { name: "Boss", value: prettyBossName.toUpperCase(), inline: false },
               { name: "Start Time", value: `<t:${Math.floor(new Date(resultWOM.data.startsAt).getTime() / 1000)}:F>`, inline: true },
               { name: "End Time", value: `<t:${Math.floor(new Date(resultWOM.data.endsAt).getTime() / 1000)}:F>`, inline: true }
            )
            .setColor(0x00ff00);
         await interaction.editReply({ embeds: [successEmbed], ephemeral: false });
      } catch (error) {
         console.error('Error executing command:', error);
         await interaction.editReply({ content: `An error occurred: ${error.message}`, ephemeral: true });
      }
   },
   async autocomplete(interaction) {
      try {
         const focusedOption = interaction.options.getFocused(true);
         const filtered = bossMetrics.filter(boss =>
            boss.replace(/_/g, ' ').toLowerCase().includes(focusedOption.value.toLowerCase())
         );
         await interaction.respond(
            filtered.slice(0, 25).map(boss => ({
               name: boss.replace(/_/g, ' '),
               value: boss,
            }))
         );
      } catch (error) {
         console.error('Error in autocomplete:', error);
      }
   }
};

module.exports.buttonHandler = async function (interaction) {

   const manageBosses = require('../../utils/weeklyEvents/manageBosses.js');
   await manageBosses.buttonHandler(interaction);
};

module.exports.modalHandler = async function (interaction) {
   const manageBosses = require('../../utils/weeklyEvents/manageBosses.js');
   await manageBosses.modalHandler(interaction);
};
