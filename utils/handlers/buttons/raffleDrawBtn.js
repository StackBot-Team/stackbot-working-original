const { EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const raffleDataPath = path.join(__dirname, '../../../data/raffleEntries.json');
const recordPath = path.join(__dirname, '../../../data/raffleStatsRecord.json');
const configPath = path.join(__dirname, '../../../data/raffleConfig.json');

async function raffleDrawBtnHandler(interaction) {

  // load entries
  if (!fs.existsSync(raffleDataPath)) {
    return interaction.reply({ content: 'No raffle data to draw from.', ephemeral: true });
  }
  const data = JSON.parse(fs.readFileSync(raffleDataPath));
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return interaction.reply({ content: 'There are no entries.', ephemeral: true });
  }

  // weighted pick
  const weighted = [];
  for (const [userId, { tickets }] of entries) {
    for (let i = 0; i < tickets; i++) weighted.push(userId);
  }
  const winnerId = weighted[Math.floor(Math.random() * weighted.length)];
  const winner = await interaction.guild.members.fetch(winnerId);

  // build winner embed
  const embed = new EmbedBuilder()
    .setTitle('<:Activity:1394919137859469424> Raffle Winner!')
    .setDescription(`**${winner.displayName}** won with \`${data[winnerId].tickets}\` ticket(s)!\n
               \`"That's efficiency, that's discipline, that's clutch."\``)
    .setThumbnail(winner.displayAvatarURL({ dynamic: true }))
    .setColor(0x00bcd4)
    .setTimestamp();

  // replace the original embed & remove buttons
  await interaction.reply({ embeds: [embed], components: [] });


}

module.exports = { raffleDrawBtnHandler };