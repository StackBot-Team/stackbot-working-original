const { SlashCommandBuilder } = require('discord.js');
const { parseDate } = require('../../utils/weeklyEvents/dateParser');
const fs = require('fs');
const path = require('path');

const removalsPath = path.join(__dirname, '../../data/removals.json');

if (!fs.existsSync(removalsPath)) {
  fs.writeFileSync(removalsPath, '[]');
}

function saveRemoval(userId, roleId, removalDate) {
  const removals = JSON.parse(fs.readFileSync(removalsPath, 'utf-8'));
  removals.push({ userId, roleId, removalTimestamp: removalDate.getTime() });
  fs.writeFileSync(removalsPath, JSON.stringify(removals, null, 2));
}

function removeExecutedTask(userId, roleId) {
  const removals = JSON.parse(fs.readFileSync(removalsPath, 'utf-8'));
  const updatedRemovals = removals.filter(task => !(task.userId === userId && task.roleId === roleId));
  fs.writeFileSync(removalsPath, JSON.stringify(updatedRemovals, null, 2));
}

async function loadPendingRemovals(guild) {
  const removals = JSON.parse(fs.readFileSync(removalsPath, 'utf-8'));
  const now = Date.now();

  for (const { userId, roleId, removalTimestamp } of removals) {
    if (removalTimestamp > now) {

      const member = await guild.members.fetch(userId).catch(console.error);
      if (member) {
        setTimeout(async () => {
          await member.roles.remove(roleId).catch(console.error);
          removeExecutedTask(userId, roleId);
        }, removalTimestamp - now);
      }
    } else {

      removeExecutedTask(userId, roleId);
    }
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set_temp_role')
    .setDescription('Adds a temporary role and schedules it for removal')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to assign the role to')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to add')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('removaldate')
        .setDescription('Date for role removal (ex. - "Oct 31 2024")')
        .setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const removalDateStr = interaction.options.getString('removaldate');

    const removalDate = parseDate(removalDateStr);
    if (!removalDate) {
      return interaction.reply({ content: 'Invalid date format. Use a recognizable format like "Oct 31 2024".', ephemeral: true });
    }

    try {
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.add(role);

      const timeUntilRemoval = removalDate - Date.now();

      setTimeout(async () => {
        await member.roles.remove(role).catch(console.error);
        removeExecutedTask(user.id, role.id);
      }, timeUntilRemoval);

      saveRemoval(user.id, role.id, removalDate);

      await interaction.reply({
        content: `Role ${role.name} added to **${user.username}** and scheduled for removal on ${removalDate.toDateString()}.`,
        ephemeral: false,
      });
    } catch (error) {
      console.error(`Failed to add role to user ${user.id}:`, error);
      await interaction.reply({ content: `Failed to add role to ${user.username}.`, ephemeral: true });
    }
  },
  loadPendingRemovals,
};
