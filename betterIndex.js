const fs = require('node:fs');
const fsa = require('fs/promises');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, ActivityType, Partials,
   ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, PermissionsBitField,
   MessageFlags } = require('discord.js');
require('dotenv').config();
const { DISCORD_TOKEN, GUILD_ID, HOME_GUILD } = process.env;
const syncRolesCommand = require('./commands/utility/syncRoles.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages], partials: [Partials.Channel] });
client.commands = new Collection();
client.messageCommands = new Collection();
syncRolesCommand.registerMessageListener(client);

const { learnerInteractions, sendOrUpdateLearnerButton } = require('./utils/handlers/learnerInteractions.js');
const { getConfig, getInfoConfig, getRoleOptions, getWeeklyConfig, getDiscRoleOptions } = require('./utils/handlers/configHelper.js');
const { sendOrUpdatePersistentButton } = require('./utils/handlers/persistentButton.js');
const { autocomplete } = require('./commands/info/playerInfo.js');
const eventStorage = require('./utils/handlers/eventStorage.js');
const { handleSotwAnnounce } = require('./utils/weeklyEvents/handleSotwAnnounce.js');
const { handleBotwAnnouncement } = require('./utils/weeklyEvents/handBotwAnnouncement.js');
const { handleApplicationDropdown, inProgress, buildDropdown } = require('./utils/handlers/applicationHandler');
const persistentFile = path.join(__dirname, './data/persistentMessages.json');
const { handleRaffleDropdown } = require('./utils/handlers/handleRaffleDropdown.js')
const { startBirthdayAnnouncements } = require('./utils/scheduler/birthdayAnnouncer.js');

// Global error handling for unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
   console.error('Unhandled Rejection at:', promise, 'reason:', reason);

});

process.on('uncaughtException', (err) => {
   console.error('Uncaught Exception thrown:', err);

});

const originalSetTimeout = global.setTimeout;

global.setTimeout = (callback, delay, ...args) => {

   if (delay < 0) {
      console.warn(`Warning: Negative timeout scheduled: ${delay}`);
      console.trace();
   }

   return originalSetTimeout(callback, delay, ...args);
};


// Load message-based commands
const messageCommandFiles = fs.readdirSync('./messageCommands').filter(file => file.endsWith('.js'));
for (const file of messageCommandFiles) {
   const messageCommand = require(`./messageCommands/${file}`);
   client.messageCommands.set(messageCommand.name, messageCommand);
}

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
   const commandsPath = path.join(foldersPath, folder);
   const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
   for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      if ('data' in command && 'execute' in command) {
         client.commands.set(command.data.name, command);
      } else {
         console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
   }
}

const { loadPendingRemovals } = require('./commands/admin/setTempRoles.js');
const { scheduleTasks } = require('./commands/admin/scheduleRole.js');


client.once(Events.ClientReady, async readyClient => {
   console.log(`Ready! Logged in as ${readyClient.user.tag}`);
   console.log('Commands loaded:', client.commands.keys());


   await loadEvents();
   const { rankApplicationId, mentorPingsId } = await getInfoConfig();

   const BIRTHDAY_CHANNEL_ID = '923708919568801823';
   startBirthdayAnnouncements(client, BIRTHDAY_CHANNEL_ID);

   if (fs.existsSync(persistentFile)) {
      const json = JSON.parse(fs.readFileSync(persistentFile));
      const { applicationMessageId, channelId } = json;

      try {
         const channel = await client.channels.fetch(channelId);
         const message = await channel.messages.fetch(applicationMessageId);
         if (!message) {
            console.warn('Application message not found. It may have been deleted.');
         } else {
            console.log('Persistent application message loaded.');

         }
      } catch (err) {
         console.error('Failed to rebind application message:', err.message);
      }
   }

   const guild = client.guilds.cache.get(GUILD_ID);

   if (rankApplicationId) {
      try {
         const targetChannel = await readyClient.channels.fetch(rankApplicationId);
         await sendOrUpdatePersistentButton(targetChannel);
      } catch (error) {
         console.error('Target channel fetch failed. It may not be configured yet.');
      }
   } else {
      console.warn('No rankApplicationId provided in configuration.');
   }

   if (mentorPingsId) {
      try {
         const learnerChannel = await readyClient.channels.fetch(mentorPingsId);
         await sendOrUpdateLearnerButton(learnerChannel, guild);
      } catch (error) {
         console.error('Learner channel fetch failed. It may not be configured yet.');
      }
   } else {
      console.warn('No mentorPingsId provided in configuration.');
   }

   client.user.setPresence({
      activities: [{ name: 'your commands.', type: ActivityType.Listening }],
      status: 'online'
   });

   if (guild) {
      await loadPendingRemovals(guild);
      console.log('Pending role removals loaded on startup.');
   } else {
      console.error('Guild not found, unable to load pending removals.');
   }

   scheduleTasks(client);
   console.log('Scheduled role tasks loaded on startup.');
});

// Global in memory store for per user application data
const applicationData = new Map();

// For disc only ranks application
const discordApplicationData = new Map();

client.on('interactionCreate', async interaction => {
   if (!interaction.isChatInputCommand()) return;
   console.log(`[${new Date().toISOString()}] Command "${interaction.commandName}" executed by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);
});


/*
    objects in the following format:
  {
    role: '1334949043641520208',        
    images: ['https://url.com/img1.png'],
    logMessageId: '987654321012345678'    
  }
*/

const raffleDataPath = path.join(__dirname, './data/raffleEntries.json');
const recordPath = path.join(__dirname, './data/raffleStatsRecord.json');
const configPath = path.join(__dirname, './data/raffleConfig.json');

const COFFER_FILE = path.resolve(__dirname, './data/coffer.json');
const TRANSACTION_LOG_CHANNEL_ID = '1397394306859274280';
const { updateCofferEmbed } = require('./utils/handlers/updateCofferEmbed.js');

const { raffleEndBtnHandler } = require('./utils/handlers/buttons/raffleEndBtn.js');
const { raffleDrawBtnHandler } = require('./utils/handlers/buttons/raffleDrawBtn.js');
const { raffleReloadHandler } = require('./utils/handlers/buttons/raffleReloadBtn.js');
const { overFlowBtnHandler } = require('./utils/handlers/buttons/cofferOverflowBtn.js');
const { handleCofferHolders } = require('./utils/handlers/buttons/cofferHoldersBtn.js');
const { handleToggleBtn } = require('./utils/handlers/buttons/cofferToggleBtn.js');
const { rafflePriceBtnHanlder } = require('./utils/handlers/buttons/rafflePriceBtn.js');
const { tickPriceModalHandler } = require('./utils/handlers/modals/ticketPriceMdl.js');

client.on('interactionCreate', async interaction => {
   try {
      if (interaction.isButton()) {
         switch (interaction.customId) {
            case 'coffer_holders':
               return handleCofferHolders(interaction);
            case 'toggle_coffer_format':
               return handleToggleBtn(interaction);
            case 'end_btn':
               return raffleEndBtnHandler(interaction);
            case 'reload_btn':
               return raffleReloadHandler(interaction);
            case 'draw_btn':
               return raffleDrawBtnHandler(interaction);
            case 'overflow_btn':
               return overFlowBtnHandler(interaction);
            case 'raffle_price_btn':
               return rafflePriceBtnHanlder(interaction)
         }
      }

      if (interaction.isAutocomplete()) {
         const command = interaction.client.commands.get(interaction.commandName);
         if (command?.autocomplete) {
            await command.autocomplete(interaction);
         }
      }

   } catch (error) {
      console.error(`Error handling interaction [${interaction.type}]`, error);
   }
});

client.on('messageCreate', async message => {
   const { overflowRoleId, transactionLogId } = await getInfoConfig();
   const { client, channelId, embeds, guild } = message;
   const admin = await client.users.fetch('1026192544377356298');

   // check if embed
   if (embeds.length === 0) return;
   if (channelId !== transactionLogId) return;

   const embed = embeds[0];
   const desc = embed.description;
   if (!desc) return;

   //const match = desc.match(/^(.+?) has (deposited|withdrawn) ([\d,]+) coin[s]?\b/i);
   //if (!match) return;
   // handles regular digits and "one" when someone deposits 1 coin
   const match = desc.match(
      /^(.+?) has (deposited|withdrawn) ((?:[\d,]+|one)) coin[s]?\b/i
   );
   if (!match) return;

   const amountStr = match[3].toLowerCase();
   let amount;
   if (amountStr === 'one') {
      amount = 1;
   } else {
      // strip commas and parse
      amount = parseInt(amountStr.replace(/,/g, ''), 10);
   }

   const rsn = match[1];
   // deposited or withdrawn
   const action = match[2];
   //const amount = parseInt(match[3].replace(/,/g, ''), 10);

   // Read and parse the existing coffer data
   let data;
   try {
      const raw = await fs.promises.readFile(COFFER_FILE, 'utf8');
      data = JSON.parse(raw);
   } catch (err) {
      console.error('Error reading coffer.json:', err);
      return;
   }

   // Pull out current balances
   let { coffer = 0, overflowHolders = {} } = data;

   // Find the guild member matching the rsn
   let member = null;
   let isOverflowMember = false;
   if (rsn && guild) {
      member = guild.members.cache.find(m =>
         m.nickname === rsn || m.user.username === rsn
      );
      if (member && overflowRoleId && member.roles.cache.has(overflowRoleId)) {
         isOverflowMember = true;
      }
   }

   // overflow members adjust overflow + coffer, others adjust coffer only
   if (isOverflowMember) {
      const prev = overflowHolders[member.id] || 0;

      if (action === 'withdrawn') {
         // add to their overflow
         overflowHolders[member.id] = prev + amount;
         if (coffer < amount) {
            console.warn(`Withdrawal of ${amount} exceeds current coffer balance of ${coffer}. Reconcile with in-game value.`);
            admin.send(`⚠ Coffer out of sync by ${(-coffer).toLocaleString()} coins.`);
         }

         coffer -= amount;
      } else {
         // remove from their overflow
         const next = Math.max(prev - amount, 0);
         if (next > 0) overflowHolders[member.id] = next;
         else delete overflowHolders[member.id];

         // add back into the coffer
         coffer += amount;
      }

      data.overflowHolders = overflowHolders;
      data.coffer = coffer;
   } else {
      // normal coffer logic
      if (action === 'deposited') {
         coffer += amount;
      } else {
         if (coffer < amount) {
            console.warn(`Withdrawal of ${amount} exceeds current coffer balance of ${coffer}. Reconcile with in-game value.`);
            admin.send(`Coffer out of sync by ${(-coffer).toLocaleString()} coins.`);
         }
         coffer -= amount;
      }
      data.coffer = coffer;
   }

   try {
      await fs.promises.writeFile(COFFER_FILE, JSON.stringify(data, null, 2));
   } catch (err) {
      console.error('Error writing coffer.json:', err);
      return;
   }

   await updateCofferEmbed(client);

})




const EVENTS_PATH = path.resolve(__dirname, 'data/betterEvents.json');

let eventsData = {};
async function loadEvents() {
   try {
      const data = await fsa.readFile(EVENTS_PATH, 'utf8');
      eventsData = JSON.parse(data);
   } catch (err) {
      console.error("Could not load events.json, starting with an empty object.", err);
      eventsData = {};
   }
}

async function saveEvents() {
   try {
      await fsa.writeFile(EVENTS_PATH, JSON.stringify(eventsData, null, 2));
   } catch (err) {
      console.error("Error writing events.json:", err);
   }
}

// // Load events at startup.
// loadEvents();


client.on('interactionCreate', async (interaction) => {
   if (!interaction.isButton()) return;

   // Only handle our specific event buttons.
   if (
      interaction.customId === 'rsvp_accept' ||
      interaction.customId === 'rsvp_decline' ||
      interaction.customId === 'rsvp_tentative' ||
      interaction.customId === 'event_edit'
   ) {

      const eventId = interaction.message.id;
      const eventData = eventStorage.getEvent(eventId);
      //const eventData = eventsData[eventId];
      if (!eventData) {
         return interaction.reply({ content: "Event data not found.", ephemeral: true });
      }

      const userId = interaction.user.id;

      if (interaction.customId !== 'event_edit') {

         eventData.rsvp.accepted = eventData.rsvp.accepted.filter(id => id !== userId);
         eventData.rsvp.declined = eventData.rsvp.declined.filter(id => id !== userId);
         eventData.rsvp.tentative = eventData.rsvp.tentative.filter(id => id !== userId);

         if (interaction.customId === 'rsvp_accept') {
            eventData.rsvp.accepted.push(userId);
         } else if (interaction.customId === 'rsvp_decline') {
            eventData.rsvp.declined.push(userId);
         } else if (interaction.customId === 'rsvp_tentative') {
            eventData.rsvp.tentative.push(userId);
         }
      } else if (interaction.customId === 'event_edit') {

         await interaction.deferUpdate();
         const dmChannel = await interaction.user.createDM();
         await handleEdit(interaction.user, eventData, dmChannel, interaction);

         eventsData[eventId] = eventData;
         await saveEvents();
         return;
      }

      eventsData[eventId] = eventData;
      await saveEvents();


      const acceptedList = eventData.rsvp.accepted.length > 0
         ? eventData.rsvp.accepted.map(id => `<@${id}>`).join(', ')
         : 'None';
      const declinedList = eventData.rsvp.declined.length > 0
         ? eventData.rsvp.declined.map(id => `<@${id}>`).join(', ')
         : 'None';
      const tentativeList = eventData.rsvp.tentative.length > 0
         ? eventData.rsvp.tentative.map(id => `<@${id}>`).join(', ')
         : 'None';


      const updatedEmbed = new EmbedBuilder()
         .setTitle(eventData.title)
         // .setDescription(`Event created by ${eventData.creatorUsername}`)
         .addFields(
            { name: '🗓️ Start Time', value: `<t:${eventData.startTime}:F> (Starts <t:${eventData.startTime}:R>)`, inline: false },
            { name: 'Duration', value: eventData.duration, inline: false },
            //{ name: '👤 Host', value: eventData.host ? `${eventData.host} ✅` : '❌', inline: true },
            { name: '👤 Host(s)', value: acceptedList, inline: true },
            { name: '👥 Helper', value: declinedList, inline: true },
            { name: '❔ Maybe', value: tentativeList, inline: true }
         )
         .setColor('Blue')
         .setFooter({ text: `Event created by ${eventData.creatorUsername}` });

      /** */

      await interaction.update({ embeds: [updatedEmbed] });
   }
});

async function handleEdit(user, eventData, dmChannel, interaction) {
   let editing = true;
   while (editing) {
      const promptEmbed = new EmbedBuilder()
         .setDescription(
            "What would you like to change?\n1. Title\n2. Start Time\n3. Duration\nType the number (or 'cancel' to exit edit mode):"
         );
      await dmChannel.send({ embeds: [promptEmbed] });

      let editChoice;
      try {
         const collectedChoice = await dmChannel.awaitMessages({
            filter: (m) => m.author.id === user.id,
            max: 1,
            time: 60000,
            errors: ['time']
         });
         editChoice = collectedChoice.first().content.trim().toLowerCase();
      } catch (err) {
         const timeoutEmbed = new EmbedBuilder().setDescription("No response received. Exiting edit mode.");
         await dmChannel.send({ embeds: [timeoutEmbed] });
         break;
      }
      if (editChoice === 'cancel') {
         const cancelEmbed = new EmbedBuilder().setDescription("Exiting edit mode.");
         await dmChannel.send({ embeds: [cancelEmbed] });
         break;
      }
      if (!['1', '2', '3'].includes(editChoice)) {
         const invalidEmbed = new EmbedBuilder().setDescription("Invalid choice. Please enter 1, 2, or 3.");
         await dmChannel.send({ embeds: [invalidEmbed] });
         continue;
      }
      let fieldName, prompt;
      if (editChoice === '1') {
         fieldName = 'title';
         prompt = "Enter the new event title:";
      } else if (editChoice === '2') {
         fieldName = 'startTime';
         prompt = "Enter the new start time (e.g. 'March 30 2025, 9:00 AM EST'):";
      } else if (editChoice === '3') {
         fieldName = 'duration';
         prompt = "Enter the new duration (e.g. '2 hours', '30 minutes'):";
      }
      const fieldPromptEmbed = new EmbedBuilder().setDescription(prompt);
      await dmChannel.send({ embeds: [fieldPromptEmbed] });

      let newValue;
      try {
         const collectedValue = await dmChannel.awaitMessages({
            filter: (m) => m.author.id === user.id,
            max: 1,
            time: 60000,
            errors: ['time']
         });
         newValue = collectedValue.first().content.trim();
      } catch (err) {
         const timeoutEmbed = new EmbedBuilder().setDescription("No response received. Exiting edit mode.");
         await dmChannel.send({ embeds: [timeoutEmbed] });
         break;
      }
      if (newValue.toLowerCase() === 'cancel') {
         const cancelEmbed = new EmbedBuilder().setDescription("Exiting edit mode.");
         await dmChannel.send({ embeds: [cancelEmbed] });
         break;
      }
      if (fieldName === 'startTime') {
         const parsedDate = chrono.parseDate(newValue);
         if (!parsedDate) {
            const errorEmbed = new EmbedBuilder().setDescription("Could not parse the new start time. Please try again.");
            await dmChannel.send({ embeds: [errorEmbed] });
            continue;
         }
         eventData.startTime = Math.floor(parsedDate.getTime() / 1000);
      } else {
         eventData[fieldName] = newValue;
      }

      const newEmbed = new EmbedBuilder()
         .setTitle(eventData.title)
         .addFields(
            {
               name: 'Start Time',
               value: `<t:${eventData.startTime}:F> (Starts <t:${eventData.startTime}:R>)`,
               inline: false
            },
            {
               name: 'Duration',
               value: eventData.duration,
               inline: false
            }
         )
         .setColor('Blue')
         .setFooter({ text: `Event created by ${interaction.member.displayName}` });

      // Update the event message.
      await interaction.message.edit({ embeds: [newEmbed] });
      const appliedEmbed = new EmbedBuilder().setDescription("Change applied. Are you finished editing? (yes/no)");
      await dmChannel.send({ embeds: [appliedEmbed] });

      let finished;
      try {
         const collectedFinished = await dmChannel.awaitMessages({
            filter: (m) => m.author.id === user.id,
            max: 1,
            time: 60000,
            errors: ['time']
         });
         finished = collectedFinished.first().content.trim().toLowerCase();
      } catch (err) {
         const timeoutEmbed = new EmbedBuilder().setDescription("No response received. Exiting edit mode.");
         await dmChannel.send({ embeds: [timeoutEmbed] });
         break;
      }
      if (finished === 'yes' || finished === 'y') {
         editing = false;
         const exitEmbed = new EmbedBuilder().setDescription("Exiting edit mode and publishing changes.");
         await dmChannel.send({ embeds: [exitEmbed] });
      }
   }
}

client.on(Events.InteractionCreate, async (interaction) => {
   //const { GUILD_ID } = await getConfig();
   const { clanMemberId } = await getInfoConfig();

   if (interaction.isButton()) {

      // Fetch the member from the guild
      const member = await interaction.guild.members.fetch(interaction.user.id);

      // Check if the member has the 'clanmember' role
      if (!member.roles.cache.has(clanMemberId)) {

         return interaction.reply({
            content: "You must be a 'clan member' to use this feature.",
            ephemeral: true
         });
      }

      // for clan ranks
      if (interaction.customId === 'persistent_button') {
         await handlePersistentButton(interaction);
         return;
      } else if (
         interaction.customId.startsWith('accept_') ||
         interaction.customId.startsWith('deny_')
      ) {
         await handleModAction(interaction);
         return;
      }

      // for discord only ranks
      if (interaction.customId === 'persistent_button2') {
         await handlePersistentButton2(interaction);
         return;
      } else if (
         interaction.customId.startsWith('app2_accept_') ||
         interaction.customId.startsWith('app2_deny_')
      ) {
         await handleModAction2(interaction);
         return;
      }

      await learnerInteractions(interaction);

      if (interaction.customId.startsWith('configure_botw_')) {
         const command = client.commands.get('create-boss-event');
         if (command && command.buttonHandler) {
            try {
               await command.buttonHandler(interaction);
            } catch (error) {
               console.error('Error handling button interaction:', error);
               if (!interaction.replied) {
                  await interaction.reply({
                     content: 'An error occurred while processing your request.',
                     ephemeral: true,
                  });
               }
            }
         }
         return;
      }


   }


   if (interaction.isStringSelectMenu() && interaction.customId.startsWith('role_select_')) {
      await handleRoleSelect(interaction);
      return;
   }

   if (interaction.isStringSelectMenu() && interaction.customId.startsWith('app2_role_select_')) {
      await handleRoleSelect2(interaction, discordApplicationData, GUILD_ID);
      return;
   }

   if (interaction.isModalSubmit()) {
      console.log(`Modal submitted: ${interaction.customId}`);
      console.log(`Received modal submission with ID: ${interaction.customId}`);

      if (interaction.customId.startsWith('configure_botw_')) {
         const command = client.commands.get('create-boss-event');
         if (command && command.modalHandler) {
            try {
               await command.modalHandler(interaction);
            } catch (error) {
               console.error('Error handling modal submission:', error);
               if (!interaction.replied) {
                  await interaction.reply({
                     content: 'An error occurred while processing your input.',
                     ephemeral: true,
                  });
               }
            }
         }
      }
      else if (interaction.customId === 'ticket_modal') {
         await tickPriceModalHandler(interaction);
      }
   }
});


async function handlePersistentButton(interaction) {

   await interaction.reply({ content: 'Check your DMs!', ephemeral: true });


   let dmChannel;
   try {
      dmChannel = await interaction.user.createDM();
   } catch (err) {
      console.error('Error opening DM channel:', err);
      return;
   }


   const roleOptions = await getRoleOptions();


   const roleSelect = new StringSelectMenuBuilder()
      .setCustomId(`role_select_${interaction.user.id}`)
      .setPlaceholder('Select a role...')
      .addOptions(roleOptions);
   const row = new ActionRowBuilder().addComponents(roleSelect);


   const embed = new EmbedBuilder()
      .setTitle('Application for Clan Ranks')
      .setDescription('Please select your primary role from the dropdown below.')
      .setColor(0x3498db);

   try {
      await dmChannel.send({ embeds: [embed], components: [row] });

   } catch (error) {
      console.error('Error sending DM to user:', error);

      await interaction.followUp({
         content: "I couldn't send you a DM. Please check your privacy settings and make sure you allow DMs from server members.",
         ephemeral: true
      });
   }
}

async function handleRoleSelect(interaction) {

   const expectedUserId = interaction.customId.split('_')[2];
   if (interaction.user.id !== expectedUserId) {
      return interaction.reply({ content: 'This select menu is not for you.', ephemeral: true });
   }

   const selectedRole = interaction.values[0];

   // Initialize and store the application data for this user.
   applicationData.set(interaction.user.id, { role: selectedRole, images: [], rsAccount: '' });

   await interaction.deferUpdate({ ephemeral: true });


   const disabledSelect = StringSelectMenuBuilder.from(interaction.component).setDisabled(true);
   const disabledRow = new ActionRowBuilder().addComponents(disabledSelect);
   await interaction.message.edit({ components: [disabledRow] });


   const dmChannel = await interaction.user.createDM();

   const ignPromptEmbed = new EmbedBuilder()
      .setTitle('Enter Your RuneScape IGN')
      .setDescription('Please type your RuneScape in-game name (IGN) now:')
      .setColor(0xAA98A9);
   await dmChannel.send({ embeds: [ignPromptEmbed] });

   const ignFilter = (msg) => msg.author.id === interaction.user.id;
   const ignCollector = dmChannel.createMessageCollector({ filter: ignFilter, time: 2 * 60 * 1000, max: 1 });

   ignCollector.on('collect', (msg) => {
      const rsAccountName = msg.content.trim();

      const appData = applicationData.get(interaction.user.id) || {};
      appData.rsAccount = rsAccountName;
      applicationData.set(interaction.user.id, appData);

      dmChannel.send(`Your RuneScape IGN has been recorded as: **${rsAccountName}**`);
   });

   ignCollector.on('end', (collected, ignReason) => {
      if (collected.size === 0) {
         dmChannel.send("No RuneScape IGN was provided. Please restart the application if this was an error.");
         return;
      }

      const verificationEmbed = new EmbedBuilder()
         .setTitle('Submit Verification')
         .setDescription("Now, please send any verification images if required for your role.\n\nWhen you're finished, type **'done'** or **'cancel'**.")
         .setColor(0xAA98A9);
      dmChannel.send({ embeds: [verificationEmbed] });


      const imageFilter = (msg) => msg.author.id === interaction.user.id;
      const imageCollector = dmChannel.createMessageCollector({ filter: imageFilter, time: 5 * 60 * 1000 });

      imageCollector.on('collect', (msg) => {
         const lowerContent = msg.content.toLowerCase();


         if (lowerContent === 'cancel') {
            imageCollector.stop('cancel');
            return;
         }

         if (lowerContent === 'done') {
            imageCollector.stop('done');
            return;
         }

         if (msg.attachments.size > 0) {
            const imageURL = msg.attachments.first().url;
            const appData = applicationData.get(interaction.user.id);
            if (appData) {
               appData.images.push(imageURL);
            }
         }
      });

      imageCollector.on('end', async (collected, imageReason) => {
         if (imageReason === 'cancel') {

            applicationData.delete(interaction.user.id);
            await dmChannel.send("Your application has been cancelled. Please return to the **#apply-for-rank** channel to start over.");
            return;
         }


         const appData = applicationData.get(interaction.user.id);
         if (!appData) return; // In case of cancellation

         const submissionEmbed = new EmbedBuilder()
            .setTitle('Application Submitted')
            .setDescription("Thank you! Your application has been submitted for review.")
            .setColor(0x2ECC71);
         await dmChannel.send({ embeds: [submissionEmbed] });

         await sendApplicationLog(interaction.user, appData);
      });
   });
}

async function sendApplicationLog(user, appData) {

   //const { GUILD_ID } = await getConfig();
   const guild = client.guilds.cache.get(GUILD_ID);
   if (!guild) return;

   let member;
   try {
      member = await guild.members.fetch(user.id);
   } catch (error) {
      console.error('Error fetching guild member:', error);
      return;
   }

   const logEmbed = new EmbedBuilder()
      .setTitle('New Role Application')
      .setDescription('A user has submitted a role application.')
      .setThumbnail(member.displayAvatarURL({ dynamic: true }))
      .addFields(
         {
            name: 'OSRS Account:',
            value: appData.rsAccount ? appData.rsAccount : 'MAIN',
            inline: false
         },
         { name: 'Applicant', value: `${member} (${member.nickname || member.user.username})`, inline: true },
         { name: 'Applied Role', value: `<@&${appData.role}>`, inline: true }
      )
      .setColor(0xF1C40F)
      .setTimestamp();


   if (appData.images.length === 0) {
      logEmbed.addFields({
         name: 'Verification',
         value: 'None provided',
         inline: false
      });
   }


   if (appData.images.length > 0) {
      logEmbed.setImage(appData.images[0]);
   }


   if (appData.images.length > 1) {

      const additionalImages = appData.images.slice(1)
         .map((url, index) => `[Image ${index + 2}](${url})`)
         .join(' ');


      logEmbed.addFields({
         name: 'Additional Verification Images',
         value: additionalImages,
         inline: false
      });
   }


   const acceptButton = new ButtonBuilder()
      .setCustomId(`accept_${user.id}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success);
   const denyButton = new ButtonBuilder()
      .setCustomId(`deny_${user.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger);
   const row = new ActionRowBuilder().addComponents(acceptButton, denyButton);


   const { applicationLogId } = await getInfoConfig();
   const logChannel = guild.channels.cache.get(applicationLogId);
   if (!logChannel) return console.error('Log channel not found');

   const logMessage = await logChannel.send({ embeds: [logEmbed], components: [row] });

   appData.logMessageId = logMessage.id;
}


async function handleModAction(interaction) {
   // console.log('handleModAction CustomID',interaction.customId)
   const [action, applicantId] = interaction.customId.split('_');


   if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: 'You do not have permission to perform this action.', ephemeral: true });
   }

   const guild = interaction.guild;
   let applicantMember;
   try {
      applicantMember = await guild.members.fetch(applicantId);
   } catch (err) {
      return interaction.reply({ content: 'Could not find the applicant in the guild.', ephemeral: true });
   }

   const appData = applicationData.get(applicantId);
   if (!appData) {
      return interaction.reply({ content: 'Application data not found.', ephemeral: true });
   }


   const finalEmbed = new EmbedBuilder()
      .setTitle(`Application ${action === 'accept' ? 'Accepted ✅' : 'Denied'}`)
      .setColor(action === 'accept' ? 0x2ECC71 : 0xE74C3C)
      .setDescription(`${interaction.user} has ${action === 'accept' ? 'accepted' : 'denied'} ${applicantMember} (${applicantMember.nickname || applicantMember.user.username})'s application.\n`)
      .addFields({ name: 'Assigned Role', value: `<@&${appData.role}>` })
      .setFooter({ text: 'StackBot', iconURL: 'https://oldschool.runescape.wiki/images/Torva_full_helm_detail.png' })
      .setTimestamp();


   if (action === 'accept') {
      try {
         await applicantMember.roles.add(appData.role);
      } catch (err) {
         console.error('Error adding role:', err);
         return interaction.reply({ content: 'Failed to add the role to the member.', ephemeral: true });
      }
   }


   const { applicationLogId } = await getInfoConfig();
   const logChannel = guild.channels.cache.get(applicationLogId);
   try {
      const logMessage = await logChannel.messages.fetch(appData.logMessageId);
      await logMessage.edit({ embeds: [finalEmbed], components: [] });
   } catch (err) {
      console.error('Error editing log message:', err);
   }

   try {
      const applicantUser = await client.users.fetch(applicantId);

      const decisionEmbed = new EmbedBuilder()
         .setTitle('Application Status')
         .setDescription(`Your application has been ${action === 'accept' ? 'accepted!' : 'denied! Please review the requirements and try again.'}`)
         .setColor(action === 'accept' ? 0x2ECC71 : 0xE74C3C)
         .setTimestamp();

      await applicantUser.send({ embeds: [decisionEmbed] });
   } catch (err) {
      console.error('Error sending DM to applicant:', err);
   }

   await interaction.reply({
      content: action === 'accept'
         ? 'This is a reminder to add the role in game!.'
         : 'Application denied. No further action required.',
      ephemeral: true
   });


   applicationData.delete(applicantId);
}


async function handlePersistentButton2(interaction) {

   await interaction.reply({ content: 'Check your DMs!', ephemeral: true });

   // Open a DM channel with the user
   let dmChannel;
   try {
      dmChannel = await interaction.user.createDM();
   } catch (err) {
      console.error('Error opening DM channel:', err);
      return;
   }
   /*
 "master": "1304532409106300968",
       "officer": "1304185130838921247",
       "commander": "1304532496398155826",
       "red_topaz": "1309891794573459526",
 
   */
   // Dynamically fetch role options from an external file
   const discRoleOptions = await getDiscRoleOptions();

   const roleSelect = new StringSelectMenuBuilder()
      .setCustomId(`app2_role_select_${interaction.user.id}`)
      .setPlaceholder('Select a role...')
      .addOptions(discRoleOptions);
   const row = new ActionRowBuilder().addComponents(roleSelect);


   const embed = new EmbedBuilder()
      .setTitle('Discord Achievement Ranks Application')
      .setDescription('Please select your achievement rank from the dropdown below.')
      .setColor(0x7F00FF);


   try {
      await dmChannel.send({ embeds: [embed], components: [row] });

   } catch (error) {
      console.error('Error sending DM to user:', error);

      await interaction.followUp({
         content: "I couldn't send you a DM. Please check your privacy settings and make sure you allow DMs from server members.",
         ephemeral: true
      });
   }
}


async function handleRoleSelect2(interaction) {
   // Ensure that only the intended user is interacting
   const expectedUserId = interaction.customId.split('_')[3];
   if (interaction.user.id !== expectedUserId) {
      return interaction.reply({ content: 'This select menu is not for you.', ephemeral: true });
   }


   const selectedRole = interaction.values[0];

   discordApplicationData.set(interaction.user.id, { role: selectedRole, images: [] });


   const confirmationEmbed = new EmbedBuilder()
      .setTitle('Submit Verification')
      .setDescription(`Now, please send any verification images if required for your role.\n\n` + `When you are finished, type **"done"** or **"cancel"**.`)
      .setColor(0xAA98A9);

   await interaction.reply({
      embeds: [confirmationEmbed],
      ephemeral: false
   });


   const disabledSelect = StringSelectMenuBuilder.from(interaction.component)
      .setDisabled(true);
   const disabledRow = new ActionRowBuilder().addComponents(disabledSelect);


   await interaction.message.edit({ components: [disabledRow] });


   const dmChannel = interaction.channel;
   const filter = (msg) => msg.author.id === interaction.user.id;
   const collector = dmChannel.createMessageCollector({ filter, time: 5 * 60 * 1000 }); // 5 minutes timeout

   collector.on('collect', (msg) => {

      // Leting the user exit the application process early
      const lowerContent = msg.content.toLowerCase();

      // If the user types "cancel", exit the process.
      if (lowerContent === 'cancel') {
         collector.stop('cancel');
         return;
      }

      // If the user types "done", end the collector and submit the application.
      if (lowerContent === 'done') {
         collector.stop('done');
         return;
      }

      if (msg.attachments.size > 0) {
         const imageURL = msg.attachments.first().url;
         const appData = discordApplicationData.get(interaction.user.id);
         appData.images.push(imageURL);
      }
   });

   collector.on('end', async (collected, reason) => {

      if (reason === 'cancel') {

         discordApplicationData.delete(interaction.user.id);

         await dmChannel.send("Your application has been cancelled. Please return to the **#apply-for-rank** channel to start over");
         return;
      }

      const appData = discordApplicationData.get(interaction.user.id);

      // In case the user canceled and data is cleaned up
      if (!appData) return;

      //await interaction.channel.send("Thank you! Your application has been submitted for review.");


      const submissionEmbed = new EmbedBuilder()
         .setTitle('Application Submitted')
         .setDescription("Thank you! Your application has been submitted for review.")
         .setColor(0x2ECC71);
      await interaction.channel.send({ embeds: [submissionEmbed] });


      await sendApplicationLog2(interaction.user, appData);
   });
}

async function sendApplicationLog2(user, appData) {

   // const { GUILD_ID } = await getConfig()
   const guild = client.guilds.cache.get(GUILD_ID);
   if (!guild) return;

   let member;
   try {
      member = await guild.members.fetch(user.id);
   } catch (error) {
      console.error('Error fetching guild member:', error);
      return;
   }

   // Build the embed for the application log
   const logEmbed = new EmbedBuilder()
      .setTitle('Discord Achievement Application')
      .setDescription('A user has submitted a role application.')
      .setThumbnail(member.displayAvatarURL({ dynamic: true }))
      .addFields(
         { name: 'Applicant', value: `${member} (${member.nickname || member.user.username})`, inline: true },
         { name: 'Applied Role', value: `<@&${appData.role}>`, inline: true }
      )
      .setColor(0x7F00FF)
      .setTimestamp();

   if (appData.images.length === 0) {
      logEmbed.addFields({
         name: 'Verification',
         value: 'None provided',
         inline: false
      });
   }

   // If there are any verification images, set the first image in the embed
   if (appData.images.length > 0) {
      logEmbed.setImage(appData.images[0]);
   }

   if (appData.images.length > 1) {

      const additionalImages = appData.images.slice(1)
         .map((url, index) => `[Image ${index + 2}](${url})`)
         .join(' ');

      logEmbed.addFields({
         name: 'Additional Verification Images',
         value: additionalImages,
         inline: false
      });
   }

   const acceptButton = new ButtonBuilder()
      .setCustomId(`app2_accept_${user.id}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success);
   const denyButton = new ButtonBuilder()
      .setCustomId(`app2_deny_${user.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger);
   const row = new ActionRowBuilder().addComponents(acceptButton, denyButton);

   const { applicationLogId } = await getInfoConfig();
   const logChannel = guild.channels.cache.get(applicationLogId);
   if (!logChannel) return console.error('Log channel not found');

   const logMessage = await logChannel.send({ embeds: [logEmbed], components: [row] });

   appData.logMessageId = logMessage.id;
}

async function handleModAction2(interaction) {

   console.log('handleModAction2 CustomID', interaction.customId)
   const [, action, applicantId] = interaction.customId.split('_');
   console.log('action:', action, 'applicantId:', applicantId)

   if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: 'You do not have permission to perform this action.', ephemeral: true });
   }

   const guild = interaction.guild;
   let applicantMember;
   try {
      applicantMember = await guild.members.fetch(applicantId);
   } catch (err) {
      return interaction.reply({ content: 'Could not find the applicant in the guild.', ephemeral: true });
   }

   const appData = discordApplicationData.get(applicantId);
   if (!appData) {
      return interaction.reply({ content: 'Application data not found.', ephemeral: true });
   }

   const finalEmbed = new EmbedBuilder()
      .setTitle(`Application ${action === 'accept' ? 'Accepted ✅' : 'Denied'}`)
      .setColor(action === 'accept' ? 0x2ECC71 : 0xE74C3C)
      .setDescription(`${interaction.user} has ${action === 'accept' ? 'accepted' : 'denied'} ${applicantMember} (${applicantMember.nickname || applicantMember.user.username})'s application.\n`)
      .addFields({ name: 'Discord Achievement Role', value: `<@&${appData.role}>` })
      .setFooter({ text: 'StackBot', iconURL: 'https://oldschool.runescape.wiki/images/Torva_full_helm_detail.png' })
      .setTimestamp();


   if (action === 'accept') {
      try {
         await applicantMember.roles.add(appData.role);
      } catch (err) {
         console.error('Error adding role:', err);
         return interaction.reply({ content: 'Failed to add the role to the member.', ephemeral: true });
      }
   }

   const { applicationLogId } = await getInfoConfig();
   const logChannel = guild.channels.cache.get(applicationLogId);
   try {
      const logMessage = await logChannel.messages.fetch(appData.logMessageId);
      await logMessage.edit({ embeds: [finalEmbed], components: [] });
   } catch (err) {
      console.error('Error editing log message:', err);
   }

   try {
      const applicantUser = await client.users.fetch(applicantId);

      const decisionEmbed = new EmbedBuilder()
         .setTitle('Application Status')
         .setDescription(`Your application has been ${action === 'accept' ? 'accepted!' : 'denied! Please review the requirements and try again.'}`)
         .setColor(action === 'accept' ? 0x2ECC71 : 0xE74C3C)
         .setTimestamp();

      await applicantUser.send({ embeds: [decisionEmbed] });
   } catch (err) {
      console.error('Error sending DM to applicant:', err);
   }

   await interaction.deferUpdate();


   discordApplicationData.delete(applicantId);
}


// Channel to listen for message trigger 
//const TRIGGER_CHANNEL_ID = '1052464576756719686';

// testing consolidation for botw/sotw trigger handling
client.on('messageCreate', async (message) => {
   const { weekliesAnnouncementId } = await getInfoConfig();
   const {
      botwAnnouncement: { threadId: botwThreadId },
      sotwAnnouncement: { threadId: sotwThreadId }
   } = await getWeeklyConfig();

   if (message.channel.id !== weekliesAnnouncementId) return;


   const triggers = [
      {
         titleIncludes: 'Boss of the Week has ended!',
         threadId: botwThreadId,
         handler: handleBotwAnnouncement
      },
      {
         titleIncludes: 'Skill of the Week has ended!',
         threadId: sotwThreadId,
         handler: handleSotwAnnounce
      }
   ];

   for (const trigger of triggers) {
      if (message.embeds.some(embed => embed.title?.includes(trigger.titleIncludes))) {
         const guild = message.guild;


         const thread = await guild.channels.fetch(trigger.threadId).catch(() => null);

         if (!thread?.isThread()) {
            console.error('Target thread not found or is not a valid thread!');
            return;
         }

         try {

            await trigger.handler(thread, guild);
            console.log(`Handled announcement for: ${trigger.titleIncludes}`);
         } catch (error) {
            console.error(`Error sending announcement for: ${trigger.titleIncludes}`, error);
         }
      }
   }
});


//allowed guild IDs
const allowedGuilds = [GUILD_ID, HOME_GUILD];


client.on(Events.GuildCreate, guild => {
   // Check if the guild is in the allowed list
   if (!allowedGuilds.includes(guild.id)) {
      console.log(`Unauthorized guild detected: ${guild.name} (${guild.id}). Leaving now.`);
      guild.leave()
         .then(() => console.log(`Left unauthorized guild: ${guild.name}`))
         .catch(error => console.error(`Failed to leave guild: ${guild.name}`, error));
   }
});


client.on('messageCreate', async message => {
   if (!message.content.startsWith('?') || message.author.bot) return;

   const args = message.content.slice(1).trim().split(/ +/);
   const commandName = args.shift().toLowerCase();

   const command = client.messageCommands.get(commandName);

   if (!command) return;

   try {
      await command.execute(message, args);
   } catch (error) {
      console.error(error);
      message.reply('There was an error executing that command.');
   }
});

client.on(Events.InteractionCreate, async interaction => {

   //  Accept/Deny
   if (
      interaction.isButton() &&
      (interaction.customId.startsWith('app_accept_') || interaction.customId.startsWith('app_deny_'))
   ) {
      const { handleModApplicationAction } = require('./utils/handlers/modApplicationActions.js');
      try {
         await handleModApplicationAction(interaction);
      } catch (error) {
         console.error('Error handling mod application action:', error);
         if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Something went wrong while processing the decision.', ephemeral: true });
         }
      }
      return;
   }


   if (interaction.isStringSelectMenu() && interaction.customId.startsWith('application_dropdown')) {


      try {
         //if not ready 
         // const gifEmbed = new EmbedBuilder()
         //   .setTitle('This feature is under maintenance!')
         //   .setDescription('Try again later, or enjoy this masterpiece meanwhile:')
         //   .setImage('https://media.giphy.com/media/3o6ozlKdWlbxGthEiY/giphy.gif')
         //   .setColor(0xffcc00);

         // await interaction.reply({
         //   embeds: [gifEmbed],
         //   ephemeral: true
         // });

         // ready 
         await handleApplicationDropdown(interaction);

      } catch (error) {
         console.error('Error handling application dropdown:', error);
         if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'There was an error processing your application.', ephemeral: true });
         }
      }
      return;
   } else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('raffle_dropdown')) {
      try {
         await handleRaffleDropdown(interaction)
         return;
      } catch (error) {
         console.log(error)
      }
   }

   // Slash command handling
   if (!interaction.isChatInputCommand()) return;

   const command = interaction.client.commands.get(interaction.commandName);

   if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
   }

   try {
      await command.execute(interaction);
   } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
         await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
         await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
   }
});


client.login(DISCORD_TOKEN);
