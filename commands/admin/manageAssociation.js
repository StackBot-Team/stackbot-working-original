const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { transformAndUpdateData } = require('../../utils/initializeUserDic.js');
const { syncRolesForMember } = require('../../utils/testRoleSyncUtils.js');
const { getInfoConfig, loadRoleMappings } = require('../../utils/handlers/configHelper.js');

const dataPath = path.join(__dirname, '../../data/output.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('manage-association')
    .setDescription('Manage the association for a Discord user.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View the association for a Discord user.')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The Discord user to view the association for.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove the association for a Discord user.')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The Discord user whose association you want to remove.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('associate')
        .setDescription('Associate a Discord user with a RuneScape display name.')
        .addUserOption(option =>
          option.setName('member')
            .setDescription('The Discord member to associate')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('displayname')
            .setDescription('The RuneScape display name to associate with')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    let data = {};
    try {
      const raw = await fs.readFile(dataPath, 'utf8');
      data = JSON.parse(raw);
    } catch (err) {
      console.error('Error reading JSON file:', err);
      return interaction.reply({ content: 'Failed to read the data file.', ephemeral: true });
    }

    if (subcommand === 'view' || subcommand === 'remove') {
      const targetUser = interaction.options.getUser('user');
      const targetUserId = targetUser.id;

      const entryKey = Object.keys(data).find(key => data[key].discordId === targetUserId);
      if (!entryKey) {
        return interaction.reply({ content: `No association found for ${targetUser}.`, ephemeral: false });
      }

      const entry = data[entryKey];

      if (subcommand === 'view') {
        return interaction.reply({ content: `${targetUser} is associated with **${entry.displayName}**.`, ephemeral: false });
      }

      if (subcommand === 'remove') {
        entry.discordId = "";

        try {
          await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
          return interaction.reply({ content: `Removed ${targetUser}'s association with **${entry.displayName}**.` });
        } catch (err) {
          console.error('Error writing JSON file:', err);
          return interaction.reply({ content: 'Error saving updated data.', ephemeral: true });
        }
      }
    }

    if (subcommand === 'associate') {
      const member = interaction.options.getUser('member');
      const displayName = interaction.options.getString('displayname');
      const guildMember = interaction.guild.members.cache.get(member.id);

      const { pendingMemberRoleId, guestRoleId, clanMemberId } = await getInfoConfig();
      const roleMappings = await loadRoleMappings();
      const rolesToRemove = [
        ...Object.values(roleMappings),
        pendingMemberRoleId,
        guestRoleId,
        clanMemberId
      ];

      try {
        await transformAndUpdateData(dataPath);
        const updatedRaw = await fs.readFile(dataPath, 'utf8');
        const updatedData = JSON.parse(updatedRaw);

        const existingEntry = Object.values(updatedData).find(item => item.discordId === member.id);
        if (existingEntry) {
          await syncRolesForMember(guildMember, roleMappings, rolesToRemove, existingEntry, clanMemberId);
          return interaction.reply({
            content: `This user's Discord ID is already linked to **${existingEntry.displayName}**. Roles have been synchronized.`,
            ephemeral: true,
          });
        }

        const entry = Object.values(updatedData).find(item => item.displayName.toLowerCase() === displayName.toLowerCase());

        if (entry) {
          if (entry.discordId) {
            return interaction.reply({
              content: `The display name "${displayName}" is already linked to another Discord ID.`,
              ephemeral: true,
            });
          }

          entry.discordId = member.id;
          await fs.writeFile(dataPath, JSON.stringify(updatedData, null, 2), 'utf8');

          await syncRolesForMember(guildMember, roleMappings, rolesToRemove, entry, clanMemberId);

          const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('Player alias updated and roles synchronized!')
            .setDescription(
              `:white_check_mark: ${member} is now associated with **${displayName}**.\n\nTheir roles have also been updated.`
            );

          return interaction.reply({ embeds: [embed], ephemeral: false });
        }

        return interaction.reply({
          content: `No entry found with the display name "${displayName}".`,
          ephemeral: true,
        });
      } catch (error) {
        console.error('Error during association:', error);
        return interaction.reply({
          content: 'An error occurred while updating the association.',
          ephemeral: true,
        });
      }
    }
  }
};
