const { EmbedBuilder } = require('discord.js');
const { getInfoConfig } = require('./configHelper.js');

async function createMentorEmbed(guild) {
  const { mentorPingsId } = await getInfoConfig();

  const roleNames = {
    cox: 'CoX Mentor',
    tob: 'ToB Mentor',
    toa: 'ToA Mentor',
    pvp: 'PVP Mentor',
  };

  const roles = {};
  for (const key in roleNames) {
    roles[key] = guild.roles.cache.find(r => r.name === roleNames[key]);
    if (!roles[key]) {
      console.warn(`Role not found: ${roleNames[key]}`);
    }
  }

  const emojiStrings = {
    cox: '<:coxMentor:1357405466522812436>',
    tob: '<:tobMentor:1357405425431089275>',
    toa: '<:toaMentor:1357405465482498368>',
    pvp: '<:pvpMentor:1357405105758015590>',
  };

  const formatMentorList = (role, emoji) => {
    if (!role) return 'Role not found.';
    const mentorLines = role.members.map(member => `${emoji} ${member}`);
    return mentorLines.length ? mentorLines.join('\n') : '\u200B';
  };

  const coxMentors = formatMentorList(roles.cox, emojiStrings.cox);
  const tobMentors = formatMentorList(roles.tob, emojiStrings.tob);
  const toaMentors = formatMentorList(roles.toa, emojiStrings.toa);
  const pvpMentors = formatMentorList(roles.pvp, emojiStrings.pvp);

  return new EmbedBuilder()
    .setTitle('MENTOR LIST')
    .setColor(0x00ae86)
    .setTimestamp()
    .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
    .setDescription(
      `Please remember that mentors are volunteering their time to help you master the content you're interested in. To receive pings for mentor sessions, check out <#${mentorPingsId}>.\n ▃▃▃▃▃▃▃▃▃▃▃▃▃`
    )
    .addFields(
      { name: 'CoX Mentors', value: coxMentors, inline: false },
      { name: 'ToB Mentors', value: tobMentors, inline: false },
      { name: 'ToA Mentors', value: toaMentors, inline: false },
      { name: 'PVP Mentors', value: pvpMentors, inline: false }
    )
    .setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
}

module.exports = { createMentorEmbed };
