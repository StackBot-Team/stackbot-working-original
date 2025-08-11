const { createMentorEmbed } = require('./mentorEmbed');
const fs = require('fs').promises;
const path = require('path');

const PERSISTENCE_FILE = path.join(__dirname, '../../data/mentorMessage.json');

async function getStoredMessageId() {
  try {
    const data = await fs.readFile(PERSISTENCE_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.messageId;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    console.error('Error reading persistent embed file:', err);
    return null;
  }
}

async function storeMessageId(messageId) {
  const data = { messageId };
  try {
    await fs.writeFile(PERSISTENCE_FILE, JSON.stringify(data), 'utf8');
  } catch (err) {
    console.error('Error writing persistent embed file:', err);
  }
}

async function publishMentorList(channel, guild) {

  await guild.members.fetch();

  const embed = await createMentorEmbed(guild);

  let mentorMessage = null;
  const storedMessageId = await getStoredMessageId();
  if (storedMessageId) {
    try {
      mentorMessage = await channel.messages.fetch(storedMessageId);
    } catch (error) {
      console.error('Error fetching stored mentor embed:', error);
      mentorMessage = null;
    }
  }


  if (mentorMessage) {
    await mentorMessage.edit({ embeds: [embed] });
    return { action: 'updated', messageId: mentorMessage.id };
  } else {
    mentorMessage = await channel.send({ embeds: [embed] });
    await storeMessageId(mentorMessage.id);
    return { action: 'created', messageId: mentorMessage.id };
  }
}

module.exports = { publishMentorList };
