const { DateTime } = require('luxon');
const { WOMClient } = require('@wise-old-man/utils');

const client = new WOMClient();

async function createWOMBossEvent(groupId, verificationCode, selectedBoss) {
  try {
    const eventTitle = `Boss of the Week`;

    const timeZone = 'America/New_York';
    const now = DateTime.now().setZone(timeZone);

    // Next Sat at 10am in eastern timne
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

    // Convert to utc
    const startDateUTC = nextSaturday.toUTC();
    //  One week after the start time
    const endDateUTC = startDateUTC.plus({ weeks: 1 });

    // make competition on Wom
    const competition = await client.competitions.createCompetition({
      title: eventTitle,
      metric: selectedBoss,
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

module.exports = { createWOMBossEvent };
