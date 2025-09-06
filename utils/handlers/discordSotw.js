const { GuildScheduledEventPrivacyLevel, GuildScheduledEventEntityType } = require('discord.js');
const { getGroupCompetitionUrl } = require('./getGroupCompURL.js');
const { DateTime } = require('luxon');

async function createDiscordSkillEvent(guild, skill, groupId) {
   try {
      const formattedSkill = skill
         .toLowerCase()
         .replace(/_/g, ' ')
         .replace(/\b\w/g, (match) => match.toUpperCase());

      const eventTitle = `Skill of the Week - ${formattedSkill}`;

      // Always Saturday 10:00 AM in New York
      const TZ = 'America/New_York';
      const nowNY = DateTime.now().setZone(TZ);

      let slotNY = nowNY.set({
         weekday: 6,
         hour: 10,
         minute: 0,
         second: 0,
         millisecond: 0,
      });

      if (slotNY <= nowNY) {
         slotNY = slotNY.plus({ weeks: 1 });
      }

      const startUTC = slotNY.toUTC();
      const endUTC = startUTC.plus({ weeks: 1 });
      const scheduledStartISO = startUTC.toISO();
      const scheduledEndISO = endUTC.toISO();
      const skillEventUrl = await getGroupCompetitionUrl(groupId, 'Skill', skill);

      const guildEvent = await guild.scheduledEvents.create({
         name: eventTitle,
         scheduledStartTime: scheduledStartISO,
         scheduledEndTime: scheduledEndISO,
         privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
         entityType: GuildScheduledEventEntityType.External,
         entityMetadata: {
            location: skillEventUrl
         },
         description: `Join us for Skill of the Week featuring **${formattedSkill}**! ${skillEventUrl ? `Check out the competition on [Wise Old Man](${skillEventUrl}).` : ''
            }`,
      });

      return {
         success: true,
         data: {
            name: guildEvent.name,
            startsAt: startUTC.toJSDate().toUTCString(),
            endsAt: endUTC.toJSDate().toUTCString(),
            link: `https://discord.com/events/${guild.id}/${guildEvent.id}`,
            womLink: skillEventUrl,
         },
      };
   } catch (error) {
      console.error('Error creating Discord event:', error);
      return { success: false, error: error.message };
   }
}

module.exports = { createDiscordSkillEvent };
