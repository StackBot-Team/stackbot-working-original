const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const potluckPath = path.join(__dirname, '../../data/potluckEntries.json');
const potluckRecordPath = path.join(__dirname, '../../data/potluckBoardRecord.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshpotluckboard')
    .setDescription('Refresh the potluck donation board with updated entries'),

  async execute(interaction) {
    if (!fs.existsSync(potluckRecordPath)) {
      await interaction.reply({ content: 'No potluck board message recorded.', ephemeral: true });
      return;
    }

    const { messageId, channelId } = JSON.parse(fs.readFileSync(potluckRecordPath));
    const channel = await interaction.guild.channels.fetch(channelId);
    const message = await channel.messages.fetch(messageId).catch(() => null);

    if (!message) {
      await interaction.reply({ content: 'Could not find the original message.', ephemeral: true });
      return;
    }

    const data = JSON.parse(fs.readFileSync(potluckPath));
    const entries = Object.entries(data);

    const description = entries.map(([userId, { displayName, donation }]) => {
      const bulletList = donation
        .split(',')
        .map(item => `• ${item.trim()}`)
        .join('\n');
      return `**${displayName}**\n${bulletList}`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle('Potluck Donations (Updated)')
      .setDescription(description)
      .setColor(0x27ae60)
      .setTimestamp();

    await message.edit({ embeds: [embed] });
    await interaction.reply({ content: '✅ Potluck board refreshed.', ephemeral: true });
  }
};
