const { promises: fs } = require('fs');
const { syncPending } = require('./simpleSync.js');
//const { loadRoleMappings } = require('./configHelper.js');

async function updateDiscordIdsForPendingMembers(guild, filePath, pendingMemberRoleId, roleMappings, clanMember) {

  const fileContent = await fs.readFile(filePath, 'utf8');
  const userList = JSON.parse(fileContent);
  // const roleMappings = await loadRoleMappings();


  // Create a lookup map with keys as the lowercase trimmed displayName.
  const userLookup = new Map(
    Object.entries(userList).map(([id, user]) => [
      user.displayName.trim().toLowerCase(),
      { id, ...user },
    ])
  );

  // Force fetch all guild members.
  const members = await guild.members.fetch({ force: true });
  const filteredMembers = [];

  for (const member of members.values()) {
    if (!member.roles.cache.has(pendingMemberRoleId) || !member.nickname) {
      continue;
    }

    const identifier = member.nickname.trim().toLowerCase();
    console.log(`Processing member: ${member.user.id} (${identifier})`);

    if (userLookup.has(identifier)) {
      const userEntry = userLookup.get(identifier);

      if (!userEntry.discordId) {
        console.log(`Updating ${userEntry.displayName} with discordId: ${member.user.id}`);
        userList[userEntry.id].discordId = member.user.id;
      } else {
        console.log(`Skipping ${userEntry.displayName}, discordId already populated: ${userEntry.discordId}`);
      }

      filteredMembers.push({ member, entry: userEntry });
    } else {
      console.log(`No match found for member: ${identifier}`);
    }
  }


  await fs.writeFile(filePath, JSON.stringify(userList, null, 2), 'utf8');
  console.log('User list file updated.');
  // await updateDiscordIdsForPendingMembers(guild, outputFilePath, pendingMemberRoleId, roleMappings, clanMemberId)

  for (const { member, entry } of filteredMembers) { // 
    try {
      await syncPending(member, roleMappings, pendingMemberRoleId, entry, clanMember);
      console.log(`Synced roles for member: ${member.user.id}`);
    } catch (error) {
      console.error(`Failed to sync roles for member: ${member.user.id}`, error);
    }
  }
}

module.exports = { updateDiscordIdsForPendingMembers };
