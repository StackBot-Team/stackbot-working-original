const fs = require('fs/promises');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

async function deleteEvent(eventId, client, eventData) {
  if (!eventData) {
    console.log(`No event data provided for event ${eventId}. Aborting deletion.`);
    return;
  }

  const durationSeconds = 3600;
  const eventEndTime = eventData.startTime * 1000 + durationSeconds * 1000;
  console.log(`deleteEvent: Event ${eventId} - eventEndTime: ${eventEndTime}, current time: ${Date.now()}`);

  if (Date.now() < eventEndTime) {
    console.log(`deleteEvent: Event ${eventId} has not ended yet. Skipping deletion.`);
    return;
  }

  const channel = client.channels.cache.get(eventData.channelId);
  if (channel) {
    try {
      console.log(`deleteEvent: Fetching message ${eventId} from channel ${eventData.channelId}`);
      const message = await channel.messages.fetch(eventId);
      if (message) {
        console.log(`deleteEvent: Message fetched for event ${eventId}. Proceeding to delete.`);
        await message.delete();
        console.log(`deleteEvent: Message for event ${eventId} deleted.`);
      } else {
        console.log(`deleteEvent: Message ${eventId} not found in channel ${eventData.channelId}.`);
      }
    } catch (err) {
      console.error(`deleteEvent: Error deleting message for event ${eventId}:`, err);
    }
  } else {
    console.log(`deleteEvent: Channel ${eventData.channelId} not found for event ${eventId}.`);
  }

  try {
    const eventsPath = path.join(__dirname, '../../data/betterEvents.json');
    console.log(`deleteEvent: Reading events file from ${eventsPath}`);
    const data = await fs.readFile(eventsPath, 'utf8');
    const events = JSON.parse(data);
    console.log(`deleteEvent: Deleting event ${eventId} from persistent store.`);
    delete events[eventId];
    await fs.writeFile(eventsPath, JSON.stringify(events, null, 2));
    console.log(`deleteEvent: Event ${eventId} deleted successfully from persistent store.`);
  } catch (err) {
    console.error(`deleteEvent: Error updating events file after deleting event ${eventId}:`, err);
  }
}

function scheduleEventDeletion(eventId, client, eventData) {
  if (!eventData) return;
  const durationSeconds = 3600;
  const eventEndTime = eventData.startTime * 1000 + durationSeconds * 1000;
  const extraDelay = 60000;
  const delay = (eventEndTime + extraDelay) - Date.now();
  console.log(`scheduleEventDeletion: Scheduling deletion for event ${eventId} with delay: ${delay}ms (including extra delay)`);
  if (delay > 0) {
    setTimeout(() => {
      console.log(`scheduleEventDeletion: Timeout reached for event ${eventId}. Attempting deletion.`);
      deleteEvent(eventId, client, eventData);
    }, delay);
  } else {
    console.log(`scheduleEventDeletion: Negative delay for event ${eventId}. Deleting immediately.`);
    deleteEvent(eventId, client, eventData);
  }
}

async function sendEventReminder(eventId, client, eventData) {
  if (!eventData) return;
  const userIds = [...eventData.rsvp.accepted, ...eventData.rsvp.declined];
  console.log(`sendEventReminder: Sending reminder for event ${eventId} to users: ${userIds.join(', ')}`);
  for (const userId of userIds) {
    try {
      const user = await client.users.fetch(userId);
      const embed = new EmbedBuilder()
        .setTitle("Event Reminder")
        .setDescription(`Reminder: The event "${eventData.title}" is about to start!`)
        .setColor('Blue')
        .setTimestamp();
      await user.send({ embeds: [embed] });
      console.log(`sendEventReminder: Reminder sent to user ${userId} for event ${eventId}.`);
    } catch (error) {
      console.error(`sendEventReminder: Failed to send reminder to user ${userId}:`, error);
    }
  }
}

function scheduleEventReminder(eventId, client, eventData) {
  if (!eventData) return;
  const reminderOffset = 10 * 60 * 1000;
  const eventStartTimeMs = eventData.startTime * 1000;
  const delay = eventStartTimeMs - reminderOffset - Date.now();
  console.log(`scheduleEventReminder: Scheduling reminder for event ${eventId} with delay: ${delay}ms`);
  if (delay > 0) {
    setTimeout(() => {
      console.log(`scheduleEventReminder: Timeout reached for reminder for event ${eventId}. Sending reminder.`);
      sendEventReminder(eventId, client, eventData);
    }, delay);
  } else {
    console.log(`scheduleEventReminder: Negative delay for event ${eventId}. Sending reminder immediately.`);
    sendEventReminder(eventId, client, eventData);
  }
}

module.exports = { scheduleEventDeletion, scheduleEventReminder };
