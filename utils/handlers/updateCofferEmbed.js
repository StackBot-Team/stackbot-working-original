const fs = require('fs');
const path = require('path');
const { createCofferEmbed } = require('./cofferEmbed');

const COFFER_FILE = path.resolve(__dirname, '../../data/coffer.json');

async function updateCofferEmbed(client) {
  let data;

  try {
    const raw = await fs.promises.readFile(COFFER_FILE, 'utf8');
    data = JSON.parse(raw);
  } catch (err) {
    console.error('Error reading coffer.json:', err);
    return;
  }

  const { publishedEmbed, coffer, overflowHolders, shortFormat } = data;
  if (!publishedEmbed?.channelId || !publishedEmbed?.messageId) return;

  try {

    const channel = await client.channels.fetch(publishedEmbed.channelId);
    if (!channel?.isTextBased()) return;

    const message = await channel.messages.fetch(publishedEmbed.messageId);
    if (!message) return;


    //const embed = createCofferEmbed(coffer, overflow, overflowHolders, channel.guild);

    //await message.edit({ embeds: [embed] });
    const { embed, row } = createCofferEmbed(
      coffer,
      Object.values(overflowHolders).reduce((s, v) => s + v, 0),
      overflowHolders,
      channel.guild,
      shortFormat
    );

    try {
      await message.edit({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Failed to update published embed:', error);
    }

  } catch (error) {
    console.error('Failed to update published embed:', error);
  }
}

module.exports = { updateCofferEmbed };
