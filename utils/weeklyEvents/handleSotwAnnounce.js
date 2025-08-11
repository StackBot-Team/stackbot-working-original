const { WOMClient } = require('@wise-old-man/utils');
const { assignSkillToTopParticipant } = require('./assignWeeklySkill.js');
const womClient = new WOMClient();
const { getInfoConfig, getWeeklyConfig } = require('../handlers/configHelper.js');
const { DateTime } = require('luxon');
const { EmbedBuilder } = require('discord.js');

function filterLastWeekCompetitions(competitions, title) {
  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);
  // oneWeekAgo.setHours(15, 0, 0, 0); 

  return competitions.filter((competition) => {
    const endsAtDate = new Date(competition.endsAt);
    return competition.title === title && endsAtDate > oneWeekAgo && endsAtDate <= today;
  });
}

function formatNumber(num) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num;
}

async function handleSotwAnnounce(targetChannel, guild) {
  const { groupId } = await getInfoConfig();
  const {
    sotwAnnouncement: { channelId: sotwChannelId }
  } = await getWeeklyConfig();

  try {
    const competitions = await womClient.groups.getGroupCompetitions(groupId, { limit: 5 });
    const lastWeekCompetitions = filterLastWeekCompetitions(competitions, 'Skill of the Week');

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
      const xpDifference = latestHistory.value - firstHistory.value;

      return { ...participant, xpDifference };
    });

    const allZeroDifferences = participantsWithDifferences.every(p => p.xpDifference === 0);
    const events = await guild.scheduledEvents.fetch();

    const todayInNY = DateTime.now().setZone('America/New_York');
    const targetTimeNY = todayInNY.set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    const targetTimeUTC = targetTimeNY.toUTC();

    const sotwEvent = events.find((event) => {
      const eventStartDate = new Date(event.scheduledStartTimestamp);
      return event.name.includes('Skill of the Week -') && eventStartDate >= targetTimeUTC.toJSDate();
    });

    let nextSkill = 'a new skill';
    let inviteURL = '';

    if (sotwEvent) {
      try {
        if (sotwEvent.name.startsWith('Skill of the Week -')) {
          nextSkill = sotwEvent.name.replace('Skill of the Week - ', '').trim();
        }

        inviteURL = await sotwEvent.createInviteURL({ channel: sotwChannelId, maxAge: 0 });
      } catch (err) {
        console.error('Error creating event invite URL:', err);
      }
    }

    if (allZeroDifferences) {
      await targetChannel.send(`@everyone\n📅 This week's Skill of the Week is ${nextSkill}!\n🔗 ${inviteURL}`);
      return;
    }

    const formattedSkill = competition.metric
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase());

    const top3 = participantsWithDifferences.slice(0, 3).map((participant, index) => {
      const placeEmojis = ['', '🥈 ', '🥉 '];
      return `${placeEmojis[index] || ''}${participant.player.displayName} - ${formatNumber(participant.xpDifference)} XP`;
    });

    const formattedXP = formatNumber(participantsWithDifferences[0].xpDifference);
    const embed = new EmbedBuilder()
      .setTitle(`<:AFK_skiller:1288329481538506762> Skill of the Week Results - ${formattedSkill}`)
      .setColor(0xFFD700)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
      .setDescription(`🥇 Congratulations to **${participantsWithDifferences[0].player.displayName}**, who claimed the lead with **${formattedXP} XP**!`)
      .addFields({ name: 'Honorable Mentions:', value: top3.slice(1).join('\n') || 'None' })
      .setTimestamp();

    embed.addFields({ name: '\u200B', value: `📅 Next Skill of the Week - **${nextSkill}**`, inline: false });

    await assignSkillToTopParticipant(guild, participantsWithDifferences);
    await targetChannel.send({ content: '@everyone', embeds: [embed] });

    if (inviteURL) {
      await targetChannel.send(`🔗 Join the next SOTW event here:\n ${inviteURL}`);
    }
  } catch (error) {
    console.error('Error fetching competition details:', error);
    await targetChannel.send('An error occurred while creating the announcement.');
  }
}

module.exports = { handleSotwAnnounce };

