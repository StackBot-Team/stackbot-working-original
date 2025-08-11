const fs = require('fs').promises;
const path = require('node:path');
const { loadRoleMappings } = require('../../utils/handlers/configHelper.js');

const outputPath = path.resolve(__dirname, '../../data/output.json');

async function assignSkillToTopParticipant(guild, participantsWithDifferences) {

  const roleMappings = await loadRoleMappings();

  try {

    const roleId = roleMappings.skiller;
    const outputData = JSON.parse(await fs.readFile(outputPath, 'utf8'));


    const topParticipant = participantsWithDifferences[0].player;
    const { id: participantId, displayName } = topParticipant;


    const participantEntry = outputData[participantId];
    if (!participantEntry || !participantEntry.discordId) {
      console.log(`Participant ${displayName} not found in output.json or missing discordId.`);
      return;
    }

    const member = await guild.members.fetch(participantEntry.discordId).catch(() => null);
    if (!member) {
      console.log(`Guild member with Discord ID ${participantEntry.discordId} not found.`);
      return;
    }


    const role = guild.roles.cache.get(roleId);
    if (!role) {
      console.log(`Role with ID ${roleId} not found in the guild.`);
      return;
    }

    await member.roles.add(role);
    console.log(`Role ${role.name} assigned to ${member.displayName}.`);
  } catch (error) {
    console.error('Error assigning role:', error);
  }
}

module.exports = { assignSkillToTopParticipant };
