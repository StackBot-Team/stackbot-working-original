const { EmbedBuilder } = require('discord.js');
const { readFile } = require('fs/promises');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, '../../data/birthdays.json');
const PARTY_GIF = 'https://i.imgur.com/2aTXt0E.gif';

async function readDb() {
  try {
    const content = await readFile(DATA_FILE, 'utf8');
    return JSON.parse(content || '{}');
  } catch (err) {
    console.error(`[Birthday] Failed to read DB: ${err.message}`);
    return {};
  }
}

function getNYMonthDay() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());
  return {
    month: Number(parts.find(p => p.type === 'month').value),
    day: Number(parts.find(p => p.type === 'day').value)
  };
}

function buildBirthdayEmbed(channel, client, userIds) {
  const isSingle = userIds.length === 1;
  let title;
  let mentionText;

  const userId = userIds[0];
  const member = channel.guild.members.cache.get(userId);

  if (isSingle) {
    const displayName = member ? member.displayName : client.users.cache.get(userId).username;
    title = `<:Activity:1394919137859469424> Happy Birthday, ${displayName}!`;
    mentionText = `Everyone wish <@${userId}> a **happy** birthday!`;
  } else {
    title = `<:Activity:1394919137859469424> Happy Birthday!`;
    mentionText = `Everyone wish ${userIds.map(id => `<@${id}>`).join(' and ')} a **happy** birthday!`;
  }

  const pun = 'Why are you always warmest on your birthday? People won\'t stop toasting you.';

  return new EmbedBuilder()
    .setColor('#00AEFF')
    .setTitle(title)
    .setDescription(`${pun}

${mentionText}`)
    .setThumbnail(isSingle ? member.displayAvatarURL({ dynamic: true, size: 256 }) : channel.guild.iconURL({ dynamic: true, size: 2048 }))
    .setImage(PARTY_GIF)
    .addFields({ name: '\u200B', value: '_Blow out the candles and enjoy!_ <:Birthday_Discord_white_theme:1402807879127400592>', inline: false })
    .setFooter({ text: `I'll always remember your birthday!`, iconURL: client.user.displayAvatarURL() });
}

async function announceBirthdays(channel, client, userIds) {
  if (userIds.length === 0) return;
  const present = userIds.filter(id => channel.guild.members.cache.has(id));

  if (present.length === 0) {

    return;
  }
  const pings = present.map(id => `<@${id}>`).join(' ');
  const embed = buildBirthdayEmbed(channel, client, present);
  await channel.send({ content: pings, embeds: [embed] });
}

async function getBirthdays({ month, day, targetUserId = null }) {
  const db = await readDb();
  let matches = Object.entries(db)
    .filter(([, v]) => v.month === month && v.day === day)
    .map(([id]) => id);
  if (targetUserId) {
    matches = matches.includes(targetUserId) ? [targetUserId] : [];
  }
  return matches;
}

module.exports = {
  getNYMonthDay,
  getBirthdays,
  announceBirthdays,
};
