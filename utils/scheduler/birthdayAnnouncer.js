const cron = require('node-cron');
const {
  getNYMonthDay,
  getBirthdays,
  announceBirthdays,
} = require('./birthdayAnnouncerHelpers');

function startBirthdayAnnouncements(client, channelId) {
  cron.schedule('0 7 * * *', async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) return;

      const { month, day } = getNYMonthDay();
      const users = await getBirthdays({ month, day });
      await announceBirthdays(channel, client, users);
    } catch (err) {
      console.error('[birthday scheduler]', err);
    }
  }, { timezone: 'America/New_York' });
}

module.exports = { startBirthdayAnnouncements };
