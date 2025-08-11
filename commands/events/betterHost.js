const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const chrono = require('chrono-node');
const fs = require('fs/promises');
const path = require('path');
const eventStorage = require('../../utils/handlers/eventStorage.js');
const { scheduleEventDeletion, scheduleEventReminder } = require('../../utils/handlers/eventCleanup.js');

const EVENTS_PATH = path.resolve(__dirname, '../../data/betterEvents.json');
let eventsData = {};


async function loadEvents() {
  try {
    const data = await fs.readFile(EVENTS_PATH, 'utf8');
    eventsData = JSON.parse(data);
  } catch (err) {
    console.error("Could not load events.json, starting with an empty object.", err);
    eventsData = {};
  }
}

async function saveEvents() {
  try {
    await fs.writeFile(EVENTS_PATH, JSON.stringify(eventsData, null, 2));
  } catch (err) {
    console.error("Error writing events.json:", err);
  }
}

loadEvents();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hosting')
    .setDescription('Create a new event and delegate hosts'),
  async execute(interaction) {

    await interaction.reply({ content: 'Check your DMs to create your event!', ephemeral: true });
    const dmChannel = await interaction.user.createDM();

    async function askQuestion(questionText) {
      const embed = new EmbedBuilder()
        .setDescription(questionText)
        .setFooter({ text: "Type 'cancel' to exit this interaction." });
      await dmChannel.send({ embeds: [embed] });
    }

    async function collectResponse() {
      const filter = (m) => m.author.id === interaction.user.id;
      try {
        const collected = await dmChannel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
        return collected.first().content.trim();
      } catch (err) {
        return null;
      }
    }

    await askQuestion("Enter the event title:");
    let response = await collectResponse();
    if (!response || response.toLowerCase() === 'cancel') {
      await dmChannel.send("Event creation canceled.");
      return;
    }
    const eventTitle = response;

    await askQuestion(
      "**When does the event start? (include a timezone)**\n\nEnter the time in any format you prefer (e.g., 'tomorrow 9am EST', 'April 11 2025 16:00UTC', or 'next Friday at 2pm PST'). Please include a valid time zone."
    );

    response = await collectResponse();
    if (!response || response.toLowerCase() === 'cancel') {
      await dmChannel.send("Event creation canceled.");
      return;
    }
    const parsedDate = chrono.parseDate(response);
    if (!parsedDate) {
      await dmChannel.send("Could not parse the date. Event creation canceled.");
      return;
    }
    const eventStartTime = Math.floor(parsedDate.getTime() / 1000);

    await askQuestion("What's the duration? (e.g., '2 hours', '30 minutes')");
    response = await collectResponse();
    if (!response || response.toLowerCase() === 'cancel') {
      await dmChannel.send("Event creation canceled.");
      return;
    }
    const eventDuration = response;

    // await askQuestion("Does this event have a host? (yes/no)");
    // response = await collectResponse();
    // if (!response || response.toLowerCase() === 'cancel') {
    //   await dmChannel.send("Event creation canceled.");
    //   return;
    // }
    // let eventHost = null;
    // if (response.toLowerCase() === 'yes' || response.toLowerCase() === 'y') {
    //   await askQuestion("Enter the host's name (or @mention):");
    //   response = await collectResponse();
    //   if (!response || response.toLowerCase() === 'cancel') {
    //     await dmChannel.send("Event creation canceled.");
    //     return;
    //   }
    //   eventHost = response;
    // }

    const answers = {
      title: eventTitle,
      startTime: eventStartTime,
      duration: eventDuration
      //host: eventHost
    };

    let eventEmbed = new EmbedBuilder()
      .setTitle(answers.title)
      //.setDescription(`Event created by ${interaction.member.displayName}`)
      .addFields(
        {
          name: '🗓️ Start Time',
          value: `<t:${answers.startTime}:F>  (Starts <t:${answers.startTime}:R>)`,
          inline: true,
        },
        { name: 'Duration', value: answers.duration || 'N/A', inline: false },
        { name: '👤 Host(s)', value: 'None', inline: true },
        { name: '👥 Helper', value: 'None', inline: true },
        { name: '❔Maybe', value: 'None', inline: true }
      )
      .setColor('Blue')
      .setFooter({ text: `Event created by ${interaction.member.displayName}` });

    const buttonsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rsvp_accept')
        .setLabel('Host')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rsvp_decline')
        .setLabel('Helper')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rsvp_tentative')
        .setLabel('Maybe')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('event_edit')
        .setLabel('Edit')
        .setStyle(ButtonStyle.Danger)
    );

    const eventMessage = await interaction.channel.send({
      embeds: [eventEmbed],
      components: [buttonsRow],
    });

    // await dmChannel.send(`Your event has been created and posted in <#${interaction.channel.id}>!`);
    const finalEmbed = new EmbedBuilder()
      .setDescription(`Your event has been created and posted in <#${interaction.channel.id}>!`)
      .setColor('#0099ff');

    await dmChannel.send({ embeds: [finalEmbed] });

    const creatorName = interaction.member.displayName;

    const eventData = {
      title: answers.title,
      startTime: answers.startTime,
      duration: answers.duration,
      //host: answers.host,
      channelId: interaction.channel.id,
      creatorUsername: creatorName,
      rsvp: {
        accepted: [],
        declined: [],
        tentative: []
      }
    };


    // eventsData[eventMessage.id] = eventData;
    // await saveEvents();

    await eventStorage.setEvent(eventMessage.id, eventData);


    scheduleEventDeletion(eventMessage.id, interaction.client, eventData);
    scheduleEventReminder(eventMessage.id, interaction.client, eventData);


    const collector = eventMessage.createMessageComponentCollector({
      componentType: 'BUTTON',
      time: 86400000,
    });

    collector.on('collect', async (btnInteraction) => {

      if (
        btnInteraction.customId !== 'rsvp_accept' &&
        btnInteraction.customId !== 'rsvp_decline' &&
        btnInteraction.customId !== 'rsvp_tentative' &&
        btnInteraction.customId !== 'event_edit'
      ) return;

      const userId = btnInteraction.user.id;

      const eventData = eventsData[eventMessage.id];
      if (!eventData) return btnInteraction.reply({ content: "Event data not found.", ephemeral: true });


      if (btnInteraction.customId !== 'event_edit') {

        eventData.rsvp.accepted = eventData.rsvp.accepted.filter(id => id !== userId);
        eventData.rsvp.declined = eventData.rsvp.declined.filter(id => id !== userId);
        eventData.rsvp.tentative = eventData.rsvp.tentative.filter(id => id !== userId);

        if (btnInteraction.customId === 'rsvp_accept') {
          eventData.rsvp.accepted.push(userId);
        } else if (btnInteraction.customId === 'rsvp_decline') {
          eventData.rsvp.declined.push(userId);
        } else if (btnInteraction.customId === 'rsvp_tentative') {
          eventData.rsvp.tentative.push(userId);
        }
      } else if (btnInteraction.customId === 'event_edit') {

        await btnInteraction.deferUpdate();
        const dmChannel = await btnInteraction.user.createDM();
        await handleEdit(btnInteraction.user, eventData, eventEmbed, eventMessage, dmChannel);
        await dmChannel.send("Event updated!");

        eventsData[eventMessage.id] = eventData;
        await saveEvents();
        return;
      }

      // eventsData[eventMessage.id] = eventData;
      // await saveEvents();

      await eventStorage.setEvent(eventMessage.id, eventData);

      const acceptedList = eventData.rsvp.accepted.length > 0
        ? eventData.rsvp.accepted.map(id => `<@${id}>`).join(', ')
        : 'None';
      const declinedList = eventData.rsvp.declined.length > 0
        ? eventData.rsvp.declined.map(id => `<@${id}>`).join(', ')
        : 'None';
      const tentativeList = eventData.rsvp.tentative.length > 0
        ? eventData.rsvp.tentative.map(id => `<@${id}>`).join(', ')
        : 'None';

      const updatedEmbed = EmbedBuilder.from(eventEmbed)
        .spliceFields(3, 3,
          { name: '👤 Host(s)', value: acceptedList, inline: true },
          { name: '👥 Helper', value: declinedList, inline: true },
          { name: '❔ Maybe', value: tentativeList, inline: true }
        );

      await btnInteraction.update({ embeds: [updatedEmbed], components: [buttonsRow] });
    });

    collector.on('end', async () => {

      const disabledRow = new ActionRowBuilder().addComponents(
        buttonsRow.components.map(component => ButtonBuilder.from(component).setDisabled(true))
      );
      try {
        await eventMessage.edit({ components: [disabledRow] });
      } catch (error) {
        if (error.code === 10008) {
          console.warn(`Event message ${eventMessage.id} not found. It was likely deleted already.`);
        } else {
          console.error('Error editing event message:', error);
        }
      }
    });
  },
};

async function handleEdit(user, eventData, eventEmbed, eventMessage, dmChannel) {
  let editing = true;
  while (editing) {
    const choiceEmbed = new EmbedBuilder()
      .setDescription(
        "What would you like to change?\n1. Title\n2. Start Time\n3. Duration\nType the number (or 'cancel' to exit edit mode):"
      );
    await dmChannel.send({ embeds: [choiceEmbed] });

    let editChoice;
    try {
      const collectedChoice = await dmChannel.awaitMessages({
        filter: (m) => m.author.id === user.id,
        max: 1,
        time: 60000,
        errors: ['time'],
      });
      editChoice = collectedChoice.first().content.trim().toLowerCase();
    } catch (err) {
      const timeoutEmbed = new EmbedBuilder()
        .setDescription("No response received. Exiting edit mode.");
      await dmChannel.send({ embeds: [timeoutEmbed] });
      break;
    }
    if (editChoice === 'cancel') {
      const cancelEmbed = new EmbedBuilder()
        .setDescription("Exiting edit mode.");
      await dmChannel.send({ embeds: [cancelEmbed] });
      break;
    }
    if (!['1', '2', '3'].includes(editChoice)) {
      const invalidEmbed = new EmbedBuilder()
        .setDescription("Invalid choice. Please enter 1, 2, or 3.");
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
    const promptEmbed = new EmbedBuilder().setDescription(prompt);
    await dmChannel.send({ embeds: [promptEmbed] });

    let newValue;
    try {
      const collectedValue = await dmChannel.awaitMessages({
        filter: (m) => m.author.id === user.id,
        max: 1,
        time: 60000,
        errors: ['time'],
      });
      newValue = collectedValue.first().content.trim();
    } catch (err) {
      const timeoutEmbed = new EmbedBuilder()
        .setDescription("No response received. Exiting edit mode.");
      await dmChannel.send({ embeds: [timeoutEmbed] });
      break;
    }
    if (newValue.toLowerCase() === 'cancel') {
      const cancelEmbed = new EmbedBuilder()
        .setDescription("Exiting edit mode.");
      await dmChannel.send({ embeds: [cancelEmbed] });
      break;
    }

    if (fieldName === 'startTime') {
      const parsedDate = chrono.parseDate(newValue);
      if (!parsedDate) {
        const errorEmbed = new EmbedBuilder()
          .setDescription("Could not parse the new start time. Please try again.");
        await dmChannel.send({ embeds: [errorEmbed] });
        continue;
      }
      eventData.startTime = Math.floor(parsedDate.getTime() / 1000);
    } else {
      eventData[fieldName] = newValue;
    }

    eventEmbed.setTitle(eventData.title);
    eventEmbed.spliceFields(0, 1, {
      name: '🗓️ Start Time',
      value: `<t:${eventData.startTime}:F> (Starts <t:${eventData.startTime}:R>)`,
      inline: false,
    });
    eventEmbed.spliceFields(1, 1, {
      name: 'Duration',
      value: eventData.duration,
      inline: false,
    });

    await eventMessage.edit({ embeds: [eventEmbed] });

    const appliedEmbed = new EmbedBuilder()
      .setDescription("Change applied. Are you finished editing? (yes/no)");
    await dmChannel.send({ embeds: [appliedEmbed] });

    let finished;
    try {
      const collectedFinished = await dmChannel.awaitMessages({
        filter: (m) => m.author.id === user.id,
        max: 1,
        time: 60000,
        errors: ['time'],
      });
      finished = collectedFinished.first().content.trim().toLowerCase();
    } catch (err) {
      const timeoutEmbed = new EmbedBuilder()
        .setDescription("No response received. Exiting edit mode.");
      await dmChannel.send({ embeds: [timeoutEmbed] });
      break;
    }
    if (finished === 'yes' || finished === 'y') {
      editing = false;
      const exitEmbed = new EmbedBuilder()
        .setDescription("Exiting edit mode and publishing changes.");
      await dmChannel.send({ embeds: [exitEmbed] });
    }

  }
}

