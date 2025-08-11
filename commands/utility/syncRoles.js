const { SlashCommandBuilder, Events } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { transformAndUpdateData } = require('../../utils/initializeUserDic.js');
const { getInfoConfig, loadRoleMappings } = require('../../utils/handlers/configHelper.js');
const { updateDiscordIdsForPendingMembers } = require('../../utils/handlers/updateId.js');

async function syncRoles(guild, outputFilePath) {
  const fiveTestData = JSON.parse(await fs.readFile(outputFilePath, 'utf8'));
  const roleMappings = await loadRoleMappings();

  const { pendingMemberRoleId, guestRoleId, clanMemberId } = await getInfoConfig();
  const clanMember = guild.roles.cache.get(clanMemberId);

  const rolesToRemove = [
    ...Object.values(roleMappings),
    guestRoleId,
    pendingMemberRoleId,
    clanMemberId
  ];

  await guild.members.fetch();
  const validEntries = Object.values(fiveTestData).filter(entry => entry.discordId);

  // consider having mod+ exempt instead of handling error
  //const exemptRoleId = '1316505301133951006';
  for (const entry of validEntries) {
    const member = guild.members.cache.get(entry.discordId);

    if (!member) {
      console.log(`Member with ID ${entry.discordId} not found in guild.`);
      continue;
    }

    // if (member.roles.cache.has(exemptRoleId)) {
    //   console.log(`Skipping role changes for ${member.displayName} (has exempt role).`);
    //   continue;
    // }

    try {
      // Always add the clanMember role
      const rolesToAdd = [clanMember];

      // Optionally add the extra role from roleMappings if it exists
      const roleId = roleMappings[entry.role];
      if (roleId) {
        const mappedRole = guild.roles.cache.get(roleId);
        if (mappedRole) {
          rolesToAdd.push(mappedRole);
        }
      }

      // Determine which roles need to be added and removed
      const rolesToAddFiltered = rolesToAdd.filter(role => role && !member.roles.cache.has(role.id));
      const rolesToRemoveFromMember = rolesToRemove.filter(roleId =>
        member.roles.cache.has(roleId) &&
        !rolesToAdd.some(role => role && role.id === roleId)
      );

      // Remove roles (unless exempted by role type)
      if (!['skiller', 'skulled'].includes(entry.role)) {
        if (rolesToRemoveFromMember.length > 0) {
          await member.roles.remove(rolesToRemoveFromMember);
        }
      }

      // Add roles if there are valid ones to add
      if (rolesToAddFiltered.length > 0) {
        await member.roles.add(rolesToAddFiltered);
        console.log(`Roles updated for ${member.displayName}`);
      }

    } catch (error) {
      console.error(`Error updating roles for ${member.displayName}:`, error);
    }
  }

  // Check and update guest roles
  await checkGuests(guild, outputFilePath);
}

async function checkGuests(guild, outputFilePath) {
  const fiveTestData = JSON.parse(await fs.readFile(outputFilePath, 'utf-8'));
  const validDiscordIds = new Set(Object.values(fiveTestData).map(entry => entry.discordId));
  const roleMappings = await loadRoleMappings();

  const { pendingMemberRoleId, guestRoleId, clanMemberId } = await getInfoConfig();

  const rolesToRemove = [
    ...Object.values(roleMappings),
    pendingMemberRoleId,
    clanMemberId

  ];

  const membersToUpdate = guild.members.cache.filter(member =>
    (member.roles.cache.has(clanMemberId)) &&
    !validDiscordIds.has(member.id)
  );

  //const exemptRoleId = '1234567';

  for (const member of membersToUpdate.values()) {
    // if (member.roles.cache.has(exemptRoleId)) {
    //   console.log(`Skipping guest role update for ${member.displayName} (has exempt role).`);
    //   continue;
    // }

    try {
      const rolesToRemoveFromMember = rolesToRemove.map(id => guild.roles.cache.get(id)).filter(Boolean);
      await member.roles.remove(rolesToRemoveFromMember);
      await member.roles.add(guestRoleId);
      console.log(`Updated ${member.displayName}: removed roles and added guest role.`);
    } catch (error) {
      console.error(`Failed to update roles for ${member.displayName}:`, error);
    }
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync_roles')
    .setDescription('Sync server roles with CC roles and assign guest roles to outdated members.'),

  async execute(interaction) {
    const { guild } = interaction;
    const outputFilePath = path.join(__dirname, '../../data/output.json');
    const { pendingMemberRoleId, clanMemberId } = await getInfoConfig();
    const roleMappings = await loadRoleMappings();

    try {
      await interaction.deferReply({ ephemeral: true });
      await transformAndUpdateData(outputFilePath);

      await syncRoles(guild, outputFilePath);
      await updateDiscordIdsForPendingMembers(guild, outputFilePath, pendingMemberRoleId, roleMappings, clanMemberId)

      await interaction.editReply('Roles synced and guest roles checked successfully!');
    } catch (error) {
      console.error('Error in syncRoles command:', error);
      await interaction.editReply('An error occurred while syncing roles. Please try again later.');
    }
  },

  registerMessageListener(client) {
    // adding small delay to avoid concurrent runs based on multiple message triggers
    const cooldowns = new Map();
    const COOLDOWN_MS = 5 * 1000;

    client.on(Events.MessageCreate, async (message) => {
      const { playerUpdateChannelId } = await getInfoConfig();
      const targetBotId = '719720369241718837';

      if (message.channel.id !== playerUpdateChannelId || message.author.id !== targetBotId) return;

      const guildId = message.guild.id;
      const now = Date.now();
      const lastRun = cooldowns.get(guildId) || 0;

      if (now - lastRun < COOLDOWN_MS) return;

      cooldowns.set(guildId, now);

      try {
        const outputFilePath = path.join(__dirname, '../../data/output.json');
        await transformAndUpdateData(outputFilePath);
        await syncRoles(message.guild, outputFilePath);

        const { pendingMemberRoleId, clanMemberId } = await getInfoConfig();
        const roleMappings = await loadRoleMappings();

        await updateDiscordIdsForPendingMembers(message.guild, outputFilePath, pendingMemberRoleId, roleMappings, clanMemberId);

        const timestamp = new Date().toISOString()
        console.log('Roles synced based on message trigger.', timestamp);
      } catch (error) {
        console.error('Error in messageCreate listener:', error);
      }
    });
  },
};
