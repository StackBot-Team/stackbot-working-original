const { WOMClient } = require('@wise-old-man/utils');
const { assignBossToTopParticipant } = require('./assignWeeklyBoss.js');
const womClient = new WOMClient();
const { getInfoConfig, getWeeklyConfig } = require('../handlers/configHelper.js');
const { DateTime } = require('luxon');
const { EmbedBuilder } = require('discord.js');

function filterLastWeekCompetitions(competitions, title) {
  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);
  //oneWeekAgo.setHours(15, 0, 0, 0); 

  return competitions.filter((competition) => {
    const endsAtDate = new Date(competition.endsAt);
    return competition.title === title && endsAtDate > oneWeekAgo && endsAtDate <= today;
  });
}

async function handleBotwAnnouncement(targetChannel, guild) {
  const { groupId } = await getInfoConfig();
  const {
    botwAnnouncement: { channelId: botwChannelId }
  } = await getWeeklyConfig();

  try {
    const competitions = await womClient.groups.getGroupCompetitions(groupId, { limit: 5 });
    const lastWeekCompetitions = filterLastWeekCompetitions(competitions, 'Boss of the Week');

    if (lastWeekCompetitions.length === 0) {
      console.log('No competition found for today.');
      return;
    }

    const competition = lastWeekCompetitions[0];
    if (!competition) {
      console.log('No competition data available.');
      return;
    }

    const topParticipants = await womClient.competitions.getCompetitionTopHistory(competition.id);

    const participantsWithDifferences = topParticipants.map((participant) => {
      const sortedHistory = participant.history.sort((a, b) => new Date(b.date) - new Date(a.date));
      const latestHistory = sortedHistory[0];
      const firstHistory = sortedHistory[sortedHistory.length - 1];

      // Adjust for -1 values in first history
      const adjustedFirstValue = (firstHistory.value === -1)
        ? (competition.metric === 'tzkal_zuk' ? 0 : 4) : firstHistory.value;

      const kcDifference = latestHistory.value - adjustedFirstValue;
      return { ...participant, kcDifference };
    });

    const events = await guild.scheduledEvents.fetch();

    const todayInNY = DateTime.now().setZone('America/New_York');
    const targetTimeNY = todayInNY.set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    const targetTimeUTC = targetTimeNY.toUTC();

    const botwEvent = events.find((event) => {
      const eventStartDate = new Date(event.scheduledStartTimestamp);
      return event.name.includes('Boss of the Week -') && eventStartDate >= targetTimeUTC.toJSDate();
    });

    let nextBoss = 'a new boss';
    let inviteURL = '';

    if (botwEvent) {
      try {
        if (botwEvent.name.startsWith('Boss of the Week -')) {
          nextBoss = botwEvent.name.replace('Boss of the Week - ', '').trim();
        }
        inviteURL = await botwEvent.createInviteURL({ channel: botwChannelId, maxAge: 0 });
      } catch (err) {
        console.error('Error creating event invite URL:', err);
      }
    }

    const filteredParticipants = participantsWithDifferences.filter(p => p.kcDifference > 0);

    if (filteredParticipants.length === 0) {
      await targetChannel.send(`@everyone\n📅 This week's Boss of the Week is ${nextBoss}!\n🔗 ${inviteURL}`);
      return;
    }

    const formattedBoss = competition.metric
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase());

    const top3 = filteredParticipants.slice(0, 3).map((participant, index) => {
      const placeEmojis = ['', '🥈 ', '🥉 '];
      return `${placeEmojis[index] || ''}${participant.player.displayName} - ${participant.kcDifference} KC`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`<:AFK_Skulled:1288329480158576693> Boss of the Week Results - ${formattedBoss}`)
      .setColor(0xFFD700)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
      .setDescription(`🥇 Congratulations to **${filteredParticipants[0].player.displayName}**, who claimed the lead with **${filteredParticipants[0].kcDifference} KC**!`)
      .addFields({ name: 'Honorable Mentions:', value: top3.slice(1).join('\n') || 'None' })
      .setTimestamp();

    embed.addFields({ name: '\u200B', value: `📅 Next Boss of the Week - **${nextBoss}**`, inline: false });

    await assignBossToTopParticipant(guild, filteredParticipants);
    await targetChannel.send({ content: '@everyone', embeds: [embed] });

    if (inviteURL) {
      await targetChannel.send(`🔗 Join the next BOTW event here:\n ${inviteURL}`);
    }
  } catch (error) {
    console.error('Error fetching competition details:', error);
    await targetChannel.send('An error occurred while creating the announcement.');
  }
}

module.exports = { handleBotwAnnouncement };

