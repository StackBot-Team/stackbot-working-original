const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');

const scheduleFilePath = path.resolve(__dirname, '../../data/schedules.json');

function loadSchedules() {
   try {
      if (fs.existsSync(scheduleFilePath) && fs.statSync(scheduleFilePath).size > 0) {
         const data = fs.readFileSync(scheduleFilePath, 'utf8');
         return JSON.parse(data);
      }
   } catch (error) {
      console.error('Error loading schedules:', error);
   }
   return [];
}

function saveSchedules(schedules) {
   try {
      fs.writeFileSync(scheduleFilePath, JSON.stringify(schedules, null, 2));
   } catch (error) {
      console.error('Error saving schedules:', error);
   }
}

// Function to schedule tasks on startup
function scheduleTasks(client) {
   const schedules = loadSchedules();

   schedules.forEach(({ userId, guildId, roleId, action, scheduleTime }) => {
      const jobDate = new Date(scheduleTime);
      if (jobDate > new Date()) {
         schedule.scheduleJob(jobDate, async () => {
            try {
               const guild = await client.guilds.fetch(guildId);
               const member = await guild.members.fetch(userId);
               if (action === 'add') {
                  await member.roles.add(roleId);
               } else if (action === 'remove') {
                  await member.roles.remove(roleId);
               }
               console.log(`Role ${action}ed for user ${userId} in guild ${guildId}`);
            } catch (error) {
               console.error(`Error executing scheduled role ${action}:`, error);
            }
         });
      }
   });
}

module.exports = {
   data: new SlashCommandBuilder()
      .setName('schedulerole')
      .setDescription('Schedule a role add or removal for a user')
      .addUserOption(option => option.setName('user').setDescription('The user to modify').setRequired(true))
      .addRoleOption(option => option.setName('role').setDescription('The role to add or remove').setRequired(true))
      .addStringOption(option =>
         option
            .setName('action')
            .setDescription('Whether to add or remove the role')
            .setRequired(true)
            .addChoices(
               { name: 'Add', value: 'add' },
               { name: 'Remove', value: 'remove' }
            ))
      .addStringOption(option => option.setName('datetime').setDescription('Date and time for the action (ex - "Nov 1 2024")').setRequired(true)),

   async execute(interaction) {
      await interaction.deferReply({ ephemeral: false });

      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const action = interaction.options.getString('action');
      const datetimeInput = interaction.options.getString('datetime');

      // Parse the date
      const scheduleTime = new Date(Date.parse(datetimeInput));

      if (isNaN(scheduleTime.getTime())) {
         await interaction.editReply('Invalid date format. Please enter a valid date and time (ex - "Nov 1 2024").');
         return;
      }

      const guildId = interaction.guild.id;
      const userId = user.id;
      const roleId = role.id;

      const member = await interaction.guild.members.fetch(userId);
      const displayName = member.nickname || member.user.username;

      schedule.scheduleJob(scheduleTime, async () => {
         try {
            const guild = await interaction.client.guilds.fetch(guildId);
            const member = await guild.members.fetch(userId);
            if (action === 'add') {
               await member.roles.add(roleId);
            } else if (action === 'remove') {
               await member.roles.remove(roleId);
            }
            console.log(`Scheduled role ${action} executed for user ${userId} in guild ${guildId}`);
         } catch (error) {
            console.error(`Error executing scheduled role ${action}:`, error);
         }
      });

      const schedules = loadSchedules();
      schedules.push({ userId, guildId, roleId, action, scheduleTime: scheduleTime.toISOString() });
      saveSchedules(schedules);

      await interaction.editReply(`Role **${role.name}** will be **${action}ed** for **${displayName}** on ${scheduleTime.toLocaleString()}.`);
   },
   scheduleTasks,
};
