const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const potluckPath = path.join(__dirname, '../../data/potluckEntries.json');
const potluckRecordPath = path.join(__dirname, '../../data/potluckBoardRecord.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('postpotluckboard')
    .setDescription('Post the potluck donation board embed'),

  async execute(interaction) {
    if (!fs.existsSync(potluckPath)) {
      await interaction.reply({ content: 'No potluck entries found.', ephemeral: true });
      return;
    }

    const data = JSON.parse(fs.readFileSync(potluckPath));
    const entries = Object.entries(data);

    if (entries.length === 0) {
      await interaction.reply({ content: 'No potluck donations yet.', ephemeral: true });
      return;
    }

    const description = entries.map(([userId, { displayName, donation }]) => {
      const bulletList = donation
        .split(',')
        .map(item => `• ${item.trim()}`)
        .join('\n');
      return `**${displayName}**\n${bulletList}`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle('Potluck Donations')
      .setDescription(description)
      .setColor(0xf1c40f)
      .setTimestamp();

    const message = await interaction.channel.send({ embeds: [embed] });

    fs.writeFileSync(potluckRecordPath, JSON.stringify({
      messageId: message.id,
      channelId: interaction.channel.id
    }, null, 2));

    await interaction.reply({ content: 'Potluck board posted.', ephemeral: true });
  }
};
