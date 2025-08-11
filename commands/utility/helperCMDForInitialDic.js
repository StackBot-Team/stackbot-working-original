const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

let playerData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/output.json'), 'utf8'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('populate_discord_ids')
    .setDescription('Update discordId for members matching displayName with server nickname or username')
    .setDefaultMemberPermissions('0'),

  async execute(interaction) {
    const guild = interaction.guild;


    console.log("Fetching members...");
    const members = await guild.members.fetch({ force: true });

    console.log(`Fetched ${members.size} members`);

    const displayNameMap = new Map(
      Object.entries(playerData).map(([id, player]) => [player.displayName.trim().toLowerCase(), { ...player, id }])
    );

    console.log(`Preprocessed ${displayNameMap.size} display names into lookup map`);


    for (const member of members.values()) {

      const hasNickname = member.nickname !== null;
      const nickname = hasNickname ? member.nickname.trim().toLowerCase() : null;
      const username = member.user.username.trim().toLowerCase();
      const nicknameOrUsername = nickname || username;

      console.log(`Processing member: ${member.user.id}`);
      console.log(`  Nickname: ${nickname || 'None'}, Username: ${username}`);
      console.log(`  Using: ${nicknameOrUsername}`);

      const matchedPlayer = displayNameMap.get(nicknameOrUsername);

      if (matchedPlayer) {
        if (matchedPlayer.discordId) {
          console.log(`Skipping ${matchedPlayer.displayName}, discordId already populated: ${matchedPlayer.discordId}`);
        } else {
          console.log(`Match found: Updating ${matchedPlayer.displayName} with discordId: ${member.user.id}`);
          playerData[matchedPlayer.id].discordId = member.user.id;
        }
      } else {
        console.log(`No match found for member: ${nicknameOrUsername}`);
      }
    }

    fs.writeFileSync(path.join(__dirname, '../../data/output.json'), JSON.stringify(playerData, null, 2), 'utf8');

    await interaction.reply({ content: 'Discord IDs updated successfully.', ephemeral: false });
  },
};
