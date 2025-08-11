const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

const fs = require('fs').promises;
const path = require('path');

const MESSAGE_ID_FILE = path.join(__dirname, './../../data/persistentMessageId.json');

async function saveMessageId(messageId) {
  await fs.writeFile(MESSAGE_ID_FILE, JSON.stringify({ id: messageId }), 'utf8');
}

async function loadMessageId() {
  try {
    const data = await fs.readFile(MESSAGE_ID_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.id;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function sendOrUpdatePersistentButton(channel) {
  const existingMessageId = await loadMessageId();

  try {
    if (existingMessageId) {

      const existingMessage = await channel.messages.fetch(existingMessageId).catch(() => null);

      if (existingMessage) {

        const button = new ButtonBuilder()
          .setCustomId('persistent_button')
          .setLabel('Clan Ranks!')
          .setStyle(ButtonStyle.Primary);

        const button2 = new ButtonBuilder()
          .setCustomId('persistent_button2')
          .setLabel('Discord Achievement Ranks!')
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(button, button2);

        const embed = new EmbedBuilder()
          .setTitle('Application for Clan Ranks')
          .setDescription('Information about our In-Game and Discord exclusive ranks can be found below:')
          .addFields(
            { name: 'Requirements:', value: `* Include any verification proof as an image attachment or imgur link.\n* Include the chatbox with your RSN.` },
            // { name: 'Discord Ranks: ', value: `[Click here for more info](https://discord.com/channels/923095291018772481/1226238735012593756)` },
            // { name: 'Clan Chat Rank: ', value: `[Click here for more info](https://discord.com/channels/923095291018772481/1247604672253132952)` }
          )
          .setColor(0x3498db) // Blue color
          .setFooter({ text: 'Make sure your DMs are open to proceed.' });

        await existingMessage.edit({
          embeds: [embed],
          components: [row],
        });

        console.log('Persistent button updated on existing message.');
        return;
      }
    }

    const button = new ButtonBuilder()
      .setCustomId('persistent_button')
      .setLabel('Clan Ranks!')
      .setStyle(ButtonStyle.Primary);

    const button2 = new ButtonBuilder()
      .setCustomId('persistent_button2')
      .setLabel('Discord Achievement Ranks!')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(button, button2);

    const embed = new EmbedBuilder()
      .setTitle('Application for Clan Ranks')
      .setDescription('Information about our In-Game and Discord exclusive ranks can be found below:')
      .addFields(
        { name: 'Requirements:', value: `* Include any verification proof as an image attachment or imgur link.\n* Include the chatbox with your RSN.` },
        // { name: 'Discord Ranks: ', value: `[Click here for more info](https://discord.com/channels/923095291018772481/1226238735012593756)` },
        // { name: 'Clan Chat Rank: ', value: `[Click here for more info](https://discord.com/channels/923095291018772481/1247604672253132952)` }
      )
      .setColor(0x3498db)
      .setFooter({ text: 'Make sure your DMs are open to proceed.' });

    const newMessage = await channel.send({
      embeds: [embed],
      components: [row],
    });


    saveMessageId(newMessage.id);
    console.log('New persistent button message created.');
  } catch (error) {
    console.error('Error managing persistent button message:', error);
  }
}

module.exports = { sendOrUpdatePersistentButton };
