const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { WOMClient } = require('@wise-old-man/utils');
const path = require('path');

const client = new WOMClient();
const playerData = require(path.resolve(__dirname, '../../data/output.json'));

async function getPlayer(playerId) {
  const playerDetails = await client.players.getPlayerDetailsById(playerId);
  const { attack, strength, defence, prayer, hitpoints, ranged, magic } = playerDetails.latestSnapshot.data.skills;
  const { combatLevel } = playerDetails;

  let res = "LVL: `" + combatLevel + "` " +
    "A: `" + attack.level + "` " +
    "S: `" + strength.level + "` " +
    "D: `" + defence.level + "` " +
    "H: `" + hitpoints.level + "` " +
    "M: `" + magic.level + "` " +
    "R: `" + ranged.level + "` " +
    "P: `" + prayer.level + "`"

  return res;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('player_stats')
    .setDescription('Displays combat stats based on nickname.'),
  async execute(interaction) {
    const nickname = interaction.member.nickname || interaction.user.username;
    const discordId = interaction.member.id;

    const foundEntry = Object.entries(playerData).find(
      ([_, details]) => details.discordId === discordId
    );

    if (foundEntry) {
      const [id] = foundEntry;
      const stats = await getPlayer(id);

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`Combat Stats`)
        .addFields({ name: `${nickname}`, value: stats, inline: true })
        .setFooter({ text: 'Powered by Wise Old Man' });

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply("No matching entry found in the database.");
    }
  },
};
