const fs = require('fs');
const path = require('path');

let playerData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/output.json'), 'utf8'));

function countPopulatedDiscordIds(data) {
  return Object.values(data).filter(player => player.discordId && player.discordId.trim() !== '').length;
}

const populatedCount = countPopulatedDiscordIds(playerData);
console.log(`Total entries with populated discordId: ${populatedCount}`);
