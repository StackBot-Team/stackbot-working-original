const { WOMClient } = require('@wise-old-man/utils');
const fs = require('fs').promises;
const { getInfoConfig } = require('./handlers/configHelper.js');

const client = new WOMClient();

async function transformAndUpdateData(outputFilePath) {
  const { groupId } = await getInfoConfig();
  try {

    let existingData = {};
    try {

      await fs.access(outputFilePath);
      const fileContent = await fs.readFile(outputFilePath, 'utf8');
      existingData = JSON.parse(fileContent);
    } catch (err) {

      existingData = {};
    }

    const group = await client.groups.getGroupDetails(groupId);
    const members = group.memberships;

    const updatedData = { ...existingData };

    // Track playerIds from the API for comparison
    const apiPlayerIds = new Set(members.map(member => member.playerId));

    // Add new members and update existing members in updatedData
    members.forEach(member => {
      const playerId = member.playerId;
      const displayName = member.player.displayName;
      const role = member.role;

      // If member exists, preserve discordId; otherwise, initialize with new entry
      updatedData[playerId] = {
        displayName: displayName,
        discordId: existingData[playerId]?.discordId || "",
        role: role || "Unknown"
      };
    });

    // Remove members from updatedData if they are no longer in the API response
    Object.keys(updatedData).forEach(playerId => {
      if (!apiPlayerIds.has(Number(playerId))) {
        delete updatedData[playerId];
      }
    });

    const isDataChanged = JSON.stringify(updatedData) !== JSON.stringify(existingData);
    if (isDataChanged) {
      await fs.writeFile(outputFilePath, JSON.stringify(updatedData, null, 2), 'utf8');
      console.log(`Data successfully updated in ${outputFilePath}`);
    } else {
      console.log('No changes detected, file was not updated.');
    }
  } catch (error) {
    console.error('Error fetching or updating data:', error);
  }
}

module.exports = { transformAndUpdateData };
