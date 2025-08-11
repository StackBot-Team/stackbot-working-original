const { WOMClient, CompetitionStatus } = require('@wise-old-man/utils');

const client = new WOMClient();


async function getGroupCompetitionUrl(groupId, title, metric) {
  try {
    const competitions = await client.competitions.searchCompetitions(
      { title, status: CompetitionStatus.UPCOMING },
      { metric },
      { type: 'classic' },
      { limit: 25 }
    );

    console.log('Competitions fetched:', competitions);

    const matchingCompetition = competitions.find((comp) => comp.groupId === groupId);

    if (!matchingCompetition) {
      console.log('No matching competition found for the group.');
      return null;
    }

    // Construct URL
    return `https://wiseoldman.net/competitions/${matchingCompetition.id}`;
  } catch (error) {
    console.error('Error fetching competitions:', error);
    return null;
  }
}

module.exports = { getGroupCompetitionUrl };