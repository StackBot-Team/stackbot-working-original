const fs = require('fs/promises');
const path = require('path');
const configPath = path.resolve(__dirname, '../../config.json');
const infoConfigPath = path.resolve(__dirname, '../../data/configInfo.json');
const weeklyConfigPath = path.resolve(__dirname, '../../data/weeklyConfig.json');
const roleOptionsPath = path.resolve(__dirname, '../../data/roles.json');
const discRoleOptionsPath = path.resolve(__dirname, '../../data/discordRoles.json');
const roleMappingsPath = path.resolve(__dirname, '../../data/role_mappings.json');

// for verificationCode, groupId 
// 1. configWomVerification.js 
async function getConfig() {
  const configData = await fs.readFile(configPath, 'utf8');
  return JSON.parse(configData);
}

// for[groupId][clanmember, guest, pending member], [trigger channels for weeklies, setRsn, and sync roles], [channels for persistent embed like mentor pings, mentor list, application embed]
// 2. configGuildRoles.js
// 3. configTriggerChannels.js
// 4. configPersistenEmbed.js
async function getInfoConfig() {
  const configData = await fs.readFile(infoConfigPath, 'utf8');
  return JSON.parse(configData);
}

// for weekly comp [announcement channel and thread]
// 5. configCompAnnounce.js
async function getWeeklyConfig() {
  const configData = await fs.readFile(weeklyConfigPath, 'utf8');
  return JSON.parse(configData);
}

// for role select drop down menu []
// 6. rolesMenuConfig.js
async function getRoleOptions() {
  try {
    const data = await fs.readFile(roleOptionsPath, 'utf8');
    const roles = JSON.parse(data);
    return roles.map(role => ({
      label: role.label,
      value: role.value,
      description: role.description,
    }));
  } catch (error) {
    console.error('Error reading roles file:', error);
    return [];
  }
}

async function getDiscRoleOptions() {
  try {
    const data = await fs.readFile(discRoleOptionsPath, 'utf8');
    const roles = JSON.parse(data);
    return roles.map(role => ({
      label: role.label,
      value: role.value,
      description: role.description,
    }));
  } catch (error) {
    console.error('Error reading roles file:', error);
    return [];
  }
}

async function loadRoleMappings() {
  try {
    const data = await fs.readFile(roleMappingsPath, 'utf8');
    const roleMappings = JSON.parse(data);
    return roleMappings;
  } catch (err) {
    console.error('Error reading file:', err);
  }
}

module.exports = { getConfig, getInfoConfig, getRoleOptions, getWeeklyConfig, getDiscRoleOptions, loadRoleMappings };
