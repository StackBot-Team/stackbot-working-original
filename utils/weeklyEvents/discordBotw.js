const { GuildScheduledEventPrivacyLevel, GuildScheduledEventEntityType } = require('discord.js');
const { WOMClient } = require('@wise-old-man/utils');
const { getGroupCompetitionUrl } = require('./getGroupCompURL.js');

const womClient = new WOMClient();

async function createDiscordBossEvent(guild, boss, groupId) {
  try {
    const formattedBoss = boss
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase());


    const eventTitle = `Boss of the Week - ${formattedBoss}`;


    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7));
    startDate.setHours(5, 0, 0, 0);

    const utcStartDate = new Date(startDate.getTime() + (5 * 60 * 60 * 1000));
    if (utcStartDate <= now) {
      utcStartDate.setDate(utcStartDate.getDate() + 7);
    }
    const utcEndDate = new Date(utcStartDate);
    utcEndDate.setDate(utcStartDate.getDate() + 7);

    const bossEventUrl = await getGroupCompetitionUrl(groupId, 'Boss', boss);


    const guildEvent = await guild.scheduledEvents.create({
      name: eventTitle,
      scheduledStartTime: utcStartDate.toISOString(),
      scheduledEndTime: utcEndDate.toISOString(),
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: GuildScheduledEventEntityType.External,
      entityMetadata: {
        location: bossEventUrl,
      },
      description: `Join us for Boss of the Week featuring **${formattedBoss}**! ${bossEventUrl ? `Check out the competition on [Wise Old Man](${bossEventUrl}).` : ''
        }`,
    });


    return {
      success: true,
      data: {
        name: guildEvent.name,
        startsAt: utcStartDate.toUTCString(),
        endsAt: utcEndDate.toUTCString(),
        link: `https://discord.com/events/${guild.id}/${guildEvent.id}`,
        womLink: bossEventUrl,
      },
    };
  } catch (error) {
    console.error('Error creating Discord event:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { createDiscordBossEvent };
