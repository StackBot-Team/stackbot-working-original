async function syncPending(guildMember, roleMappings, pendingMember, entry, clanMember) {
  try {
    const rolesToAdd = [];
    const roleId = roleMappings[entry.role];

    if (roleId) {
      const mainRole = guildMember.guild.roles.cache.get(roleId);
      const clanRole = guildMember.guild.roles.cache.get(clanMember);
      if (mainRole) rolesToAdd.push(mainRole);
      if (clanRole) rolesToAdd.push(clanRole);
    }

    if (rolesToAdd.length > 0) {
      await guildMember.roles.add(rolesToAdd);
      console.log(`Added roles for ${guildMember.displayName}`);
    } else {
      console.log(`No roles to add for ${guildMember.displayName}`);
    }

    if (guildMember.roles.cache.has(pendingMember)) {
      await guildMember.roles.remove(pendingMember);
      console.log(`Removed pending role from ${guildMember.displayName}`);
    }
  } catch (error) {
    console.error(`Error syncing roles for ${guildMember.displayName}:`, error);
  }
}

module.exports = { syncPending };
