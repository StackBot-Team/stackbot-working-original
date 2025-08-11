const { WOMClient } = require('@wise-old-man/utils');

const client = new WOMClient();

async function getExistingCompetitions(groupId, metric) {
  try {

    const competitions = await client.groups.getGroupCompetitions(groupId);
    console.log('Fetched competitions:', competitions);


    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7));
    targetDate.setUTCHours(15, 0, 0, 0);

    const matchingCompetitions = competitions.filter((comp) =>
      new Date(comp.startsAt).getTime() === targetDate.getTime() &&
      comp.title.toLowerCase().includes(metric)
    );

    console.log('Matching competitions:', matchingCompetitions);
    return matchingCompetitions;
  } catch (error) {
    console.error('Error fetching competitions:', error);
    return [];
  }
}

module.exports = { getExistingCompetitions };
