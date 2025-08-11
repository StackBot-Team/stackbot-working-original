const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const raffleDataPath = path.join(__dirname, '../../data/raffleEntries.json');
const recordPath = path.join(__dirname, '../../data/raffleStatsRecord.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshrafflestats')
    .setDescription('Refresh the raffle ticket embed with updated entry data'),

  async execute(interaction) {
    if (!fs.existsSync(recordPath)) {
      await interaction.reply({ content: 'No posted raffle stats message to update.', ephemeral: true });
      return;
    }

    const { messageId, channelId } = JSON.parse(fs.readFileSync(recordPath));
    const channel = await interaction.guild.channels.fetch(channelId);
    const message = await channel.messages.fetch(messageId).catch(() => null);

    if (!message) {
      await interaction.reply({ content: 'Failed to fetch the original raffle message.', ephemeral: true });
      return;
    }

    const data = JSON.parse(fs.readFileSync(raffleDataPath));
    const entries = Object.entries(data);

    let totalTickets = 0;

    const description = await Promise.all(entries.map(async ([userId, { tickets }]) => {
      totalTickets += tickets;
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      return member ? `${member} — \`${tickets} ticket(s)\`` : null;
    }));

    const totalValue = (totalTickets * 0.5).toFixed(1);

    const embed = new EmbedBuilder()
      .setTitle('🎟️ Raffle Entries')
      .setDescription(`${description.filter(Boolean).join('\n')}\n\n**Total Pot Value:** ${totalValue}M`)
      .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 1024 }))
      .setColor(0x2ecc71)
      .setTimestamp();

    await message.edit({ embeds: [embed] });
    await interaction.reply({ content: '✅ Raffle stats refreshed.', ephemeral: true });
  }
};
