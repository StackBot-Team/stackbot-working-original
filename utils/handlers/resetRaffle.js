const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const rafflePath = path.join(__dirname, '../../data/raffleEntries.json');
const potluckPath = path.join(__dirname, '../../data/potluckEntries.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Resets raffle and potluck entries'),

  async execute(interaction) {
    try {
      fs.writeFileSync(rafflePath, JSON.stringify({}, null, 2));
      fs.writeFileSync(potluckPath, JSON.stringify({}, null, 2));

      const embed = new EmbedBuilder()
        .setTitle('✅ Entries Reset')
        .setDescription('All **raffle** and **potluck** entries have been cleared.')
        .setColor(0x2ecc71)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (err) {
      console.error('Error resetting files:', err);

      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Reset Failed')
        .setDescription('Encountered an issue with resetting the entries.')
        .setColor(0xe74c3c)
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: false });
    }
  }
};
