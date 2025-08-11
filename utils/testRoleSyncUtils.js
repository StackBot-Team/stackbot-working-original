async function syncRolesForMember(guildMember, roleMappings, rolesToRemove, entry, clanMember) {
  try {
    // Always add the clan member role first
    const rolesToAdd = [guildMember.guild.roles.cache.get(clanMember)];

    // Check if the role exists in the roleMappings
    const roleId = roleMappings[entry.role];
    if (roleId) {
      const mappedRole = guildMember.guild.roles.cache.get(roleId);
      if (mappedRole) {
        rolesToAdd.push(mappedRole);
      }
    }

    // Remove roles that shouldn't be there
    const rolesToAddFiltered = rolesToAdd.filter(role => role && !guildMember.roles.cache.has(role.id));
    const rolesToRemoveFromMember = rolesToRemove.filter(roleId =>
      guildMember.roles.cache.has(roleId) &&
      !rolesToAdd.some(role => role && role.id === roleId)
    );

    // Skip role removal for exempt roles
    if (!['skiller', 'skulled'].includes(entry.role)) {
      if (rolesToRemoveFromMember.length > 0) {
        await guildMember.roles.remove(rolesToRemoveFromMember);
      }
    }

    // Add roles if valid ones to add
    if (rolesToAddFiltered.length > 0) {
      await guildMember.roles.add(rolesToAddFiltered);
      console.log(`Roles updated for ${guildMember.displayName}`);
    } else {
      console.log(`No role changes needed for ${guildMember.displayName}`);
    }
  } catch (error) {
    console.error(`Error updating roles for ${guildMember.displayName}:`, error);
  }
}

module.exports = { syncRolesForMember };
