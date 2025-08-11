const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../data/output.json');
const { EmbedBuilder } = require('discord.js');
const { transformAndUpdateData } = require('../utils/initializeUserDic.js');
const { syncRolesForMember } = require('../utils/testRoleSyncUtils.js');
const { getInfoConfig, loadRoleMappings } = require('./../utils/handlers/configHelper.js');
const { WOMClient, GroupRole } = require('@wise-old-man/utils');
const client = new WOMClient();
require('dotenv').config();
const { VERIFICATION_CODE } = process.env;

function sendEmbed(channel, color, description) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(description);
  channel.send({ embeds: [embed] });
}

module.exports = {
  name: 'rsn',
  description: 'Set your nickname and optionally link your Discord ID to your RuneScape ID for role tracking.',

  async execute(message, args) {
    const { pendingMemberRoleId, guestRoleId, clanMemberId, setRsnChannelId, groupId } = await getInfoConfig();
    const roleMappings = await loadRoleMappings();
    const rolesToRemove = [
      ...Object.values(roleMappings),
      pendingMemberRoleId,
      guestRoleId,
      clanMemberId
    ];

    if (message.channel.id !== setRsnChannelId) {
      return sendEmbed(message.channel, 'Red', `❌ Please use this command in <#${setRsnChannelId}>.`);
    }

    //const nicknameInput = args.join(' ').replace(/_/g, " ");
    // taking care of underlines and spaces
    const nicknameInput = args
      .join(' ')
      .replace(/[_-]/g, " ");

    const { guild, author } = message;
    const member = guild.members.cache.get(author.id);

    if (!nicknameInput) {
      return sendEmbed(message.channel, 'Red', '❌ Please provide a new nickname. Usage: `?rsn <newNickname>`');
    }

    try {
      await member.setNickname(nicknameInput);
      await transformAndUpdateData(filePath);

      let clanData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const existingEntry = Object.values(clanData).find(
        (entry) => entry.displayName.toLowerCase() === nicknameInput.toLowerCase()
      );

      if (existingEntry) {
        existingEntry.discordId = existingEntry.discordId || author.id;
        fs.writeFileSync(filePath, JSON.stringify(clanData, null, 2));
        await syncRolesForMember(member, roleMappings, rolesToRemove, existingEntry, clanMemberId);
        return sendEmbed(message.channel, 'Green', '✅ Nickname set.');
      }

      // Handling guest role
      if (member.roles.cache.has(guestRoleId)) {
        return sendEmbed(message.channel, 'Green', '✅ Nickname set for guest.');
      }

      // Checking if the player exists in WOM
      const searchResults = await client.players.searchPlayers(nicknameInput, { limit: 1 });
      const player = searchResults[0];

      // Handles PendingMember and making new WOM entry
      if (player && player.username.toLowerCase() === nicknameInput.toLowerCase()) {
        // Add player to the group (with appropriate role)
        await client.groups.addMembers(groupId, [
          { username: player.username, role: GroupRole.DOGSBODY }
        ], VERIFICATION_CODE);

        await transformAndUpdateData(filePath);
        clanData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        const updatedEntry = Object.values(clanData).find(
          (entry) => entry.displayName.toLowerCase() === player.username.toLowerCase()
        );

        if (updatedEntry) {
          updatedEntry.discordId = author.id;
          fs.writeFileSync(filePath, JSON.stringify(clanData, null, 2));
          await syncRolesForMember(member, roleMappings, rolesToRemove, updatedEntry, clanMemberId);
        } else {
          console.warn('No updated entry found for', player.username);
        }

        return sendEmbed(message.channel, 'Green', '✅ Nickname set and roles synchronized.');
      }

      // Handle PendingMember without new WOM entry 
      // if (member.roles.cache.has(pendingMemberRoleId)) {
      //   return sendEmbed(message.channel, 'Green', '✅ Nickname set. Please join the cc in game.');
      // }

      return sendEmbed(message.channel, 'Yellow', '✅ Nickname set.');
    } catch (error) {
      console.error('Error setting nickname or updating data:', error);
      return sendEmbed(message.channel, 'Red', '❌ An error occurred while processing your request.');
    }
  },
};


