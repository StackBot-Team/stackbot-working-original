const { DateTime } = require('luxon');
const { WOMClient } = require('@wise-old-man/utils');

const client = new WOMClient();
const TZ = 'America/New_York';

async function getExistingCompetitions(groupId, metric) {
   try {

      const nowLocal = DateTime.now().setZone(TZ);
      let slot = nowLocal.set({ weekday: 6, hour: 10, minute: 0, second: 0, millisecond: 0 });
      if (slot <= nowLocal) {
         slot = slot.plus({ weeks: 1 });
      }
      const targetStart = slot.toUTC().toMillis();
      const competitions = await client.groups.getGroupCompetitions(groupId);

      const keyword = metric.toLowerCase();
      return competitions.filter((comp) => {
         const startsAt = new Date(comp.startsAt).getTime();
         return startsAt === targetStart && (comp.title || '').toLowerCase().includes(keyword);
      });
   } catch (err) {
      console.error('Error fetching competitions:', err);
      return [];
   }
}

module.exports = { getExistingCompetitions };
