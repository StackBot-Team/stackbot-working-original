const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { transformAndUpdateData } = require('../../utils/initializeUserDic.js');
const { syncRolesForMember } = require('../../utils/testRoleSyncUtils.js');
const { WOMClient, GroupRole } = require('@wise-old-man/utils');
require('dotenv').config();
const { VERIFICATION_CODE } = process.env;
const outputFilePath = path.resolve(__dirname, '../../data/output.json');
const client = new WOMClient();
const { getInfoConfig, loadRoleMappings } = require('./../../utils/handlers/configHelper.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setnickname')
    .setDescription('Assigns a nickname and links the member to their OSRS account if it matches their IGN')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addUserOption((option) =>
      option.setName('user')
        .setDescription('The user to assign a nickname to')
        .setRequired(true))
    .addStringOption((option) =>
      option.setName('nickname')
        .setDescription('The nickname to assign')
        .setRequired(true)),

  async execute(interaction) {
    const { pendingMemberRoleId, guestRoleId, clanMemberId, groupId } = await getInfoConfig();
    const roleMappings = await loadRoleMappings();

    const rolesToRemove = [
      ...Object.values(roleMappings),
      pendingMemberRoleId,
      guestRoleId,
      clanMemberId
    ];

    //const { VERIFICATION_CODE } = await getConfig();

    const user = interaction.options.getUser('user');
    const nickname = interaction.options.getString('nickname');
    const member = await interaction.guild.members.fetch(user.id);
    const newNickName = nickname.replace(/_/g, " ");

    try {

      await transformAndUpdateData(outputFilePath);
      let playerData;

      try {
        playerData = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
      } catch (error) {
        console.error('Failed to load output.json:', error);
        return interaction.reply({ content: 'Error loading data.', ephemeral: true });
      }

      // Set the nickname
      await member.setNickname(nickname);
      await interaction.reply({ content: `Nickname set to "${nickname}" for ${user.username}`, ephemeral: true });

      // Check if the users discord id is already associated with an entry
      const existingEntry = Object.values(playerData).find((entry) => entry.discordId === user.id);
      if (existingEntry) {
        await syncRolesForMember(member, roleMappings, rolesToRemove, existingEntry, clanMemberId);
        return interaction.followUp({
          content: `The member's Discord ID is already linked to an existing OSRS Player. Roles have been synchronized.`,
          ephemeral: true,
        });
      }

      // Check if the nickname matches an entry in output.json
      const entry = Object.values(playerData).find((entry) => entry.displayName.toLowerCase() === newNickName.toLowerCase());

      if (entry) {
        if (entry.discordId) {
          return interaction.followUp({
            content: `The display name "${nickname}" is already linked to another Discord ID. Contact an admin for further assistance.`,
            ephemeral: true,
          });
        }

        // If no discordId is set, update it
        entry.discordId = user.id;
        fs.writeFileSync(outputFilePath, JSON.stringify(playerData, null, 2));
        await syncRolesForMember(member, roleMappings, rolesToRemove, entry, clanMemberId);
        return interaction.followUp({
          content: `✅ The member's Discord ID has been linked to OSRS player \`${nickname}\`. Roles set and synchronized.`,
          ephemeral: true,
        });
      }

      // If no matching entry, add to Wise Old Man group
      // const searchResults = await client.players.searchPlayers(newNickName, { limit: 1 });
      // const player = searchResults[0];

      // // Ensure an exact match
      // if (player && player.username.toLowerCase() === newNickName.toLowerCase()) {



      //   // Add the player to the WOM Group
      //   await client.groups.addMembers(groupId, [
      //     { username: player.username, role: GroupRole.DOGSBODY },
      //   ], VERIFICATION_CODE);

      //   await transformAndUpdateData(outputFilePath);
      //   playerData = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));


      //   const newEntry = Object.values(playerData).find(
      //     (entry) => entry.displayName.toLowerCase() === player.username.toLowerCase()
      //   );

      //   if (newEntry) {
      //     newEntry.discordId = user.id;
      //     fs.writeFileSync(outputFilePath, JSON.stringify(playerData, null, 2));
      //     await syncRolesForMember(member, roleMappings, rolesToRemove, newEntry, clanMemberId);
      //     return interaction.followUp({
      //       content: `✅ The player \`${player.username}\` has been added to the Wise Old Man group. Discord ID linked and roles synchronized.`,
      //       ephemeral: true,
      //     });
      //   }
      // }

      // return interaction.followUp({
      //   content: `No OSRS player found with the display name "${nickname}".`,
      //   ephemeral: true,
      // });
    } catch (error) {
      console.error('Error setting nickname or updating output.json:', error);
      await interaction.reply({ content: 'There was an error setting the nickname or updating the database.', ephemeral: true });
    }
  },
};
