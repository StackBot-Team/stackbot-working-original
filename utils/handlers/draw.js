const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const raffleDataPath = path.join(__dirname, '../../data/raffleEntries.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('draw')
    .setDescription('🎟️ Draw a random raffle winner based on ticket count'),

  async execute(interaction) {
    if (!fs.existsSync(raffleDataPath)) {
      return await interaction.reply({ content: 'No raffle data found.', ephemeral: true });
    }

    const data = JSON.parse(fs.readFileSync(raffleDataPath));
    const entries = Object.entries(data);

    if (entries.length === 0) {
      return await interaction.reply({ content: 'There are no entries to draw from.', ephemeral: true });
    }

    // weighted array
    const weighted = [];
    for (const [userId, { tickets }] of entries) {
      for (let i = 0; i < tickets; i++) {
        weighted.push(userId);
      }
    }

    const winnerId = weighted[Math.floor(Math.random() * weighted.length)];
    const winner = await interaction.guild.members.fetch(winnerId).catch(() => null);

    if (!winner) {
      return await interaction.reply('Winner could not be fetched (possibly left the server).');
    }

    const embed = new EmbedBuilder()
      .setTitle('🎉 Raffle Winner!')
      .setDescription(`Congratulations to **${winner.displayName}**!\nThey won with \`${data[winnerId].tickets}\` ticket(s)!`)
      .setThumbnail(winner.displayAvatarURL({ dynamic: true }))
      .setColor(0x9b59b6)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
