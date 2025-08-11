const { DateTime } = require('luxon');
const { WOMClient } = require('@wise-old-man/utils');

const client = new WOMClient();

async function createWOMSkillEvent(groupId, verificationCode, selectedSkill) {
  try {
    const eventTitle = `Skill of the Week`;

    const timeZone = 'America/New_York';
    const now = DateTime.now().setZone(timeZone);

    let nextSaturday = now.set({
      weekday: 6,
      hour: 10,
      minute: 0,
      second: 0,
      millisecond: 0,
    });

    if (nextSaturday <= now) {
      nextSaturday = nextSaturday.plus({ weeks: 1 });
    }

    const startDateUTC = nextSaturday.toUTC();

    // The event ends one week later.
    const endDateUTC = startDateUTC.plus({ weeks: 1 });

    console.log('Start Date (UTC):', startDateUTC.toISO());

    const competition = await client.competitions.createCompetition({
      title: eventTitle,
      metric: selectedSkill,
      startsAt: startDateUTC.toISO(),
      endsAt: endDateUTC.toISO(),
      groupId,
      groupVerificationCode: verificationCode,
    });

    return {
      success: true,
      data: {
        title: eventTitle,
        metric: competition.metric,
        startsAt: startDateUTC.toISO(),
        endsAt: endDateUTC.toISO(),
        url: `https://wiseoldman.net/competitions/${competition.id}`,
      },
    };
  } catch (error) {
    console.error('Error creating competition:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { createWOMSkillEvent };
