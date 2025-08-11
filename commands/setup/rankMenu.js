const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');

const rolesFilePath = path.join(__dirname, '../../data/roles.json');
const otherFilePath = path.join(__dirname, '../../data/other.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rankmenu')
    .setDescription('Manage rank menu entries')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('publish')
        .setDescription('Edit or add a role description for the dropdown menu')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Select which rank type to edit')
            .setRequired(true)
            .addChoices(
              { name: 'Clan Chat Roles', value: 'roles' },
              { name: 'Discord Roles', value: 'other' }
            )
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Select the role (mention it like @Fire Cape)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Role description or requirements (ex. obtained firecape)')
            .setRequired(true)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Removes an entry from the roles application dropdown')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Select which roles dropdown to edit')
            .setRequired(true)
            .addChoices(
              { name: 'Clan Chat Roles', value: 'roles' },
              { name: 'Discord Roles', value: 'other' }
            )
        )
        .addStringOption(option =>
          option
            .setName('label')
            .setDescription('The label of the entry to remove')
            .setRequired(true)
        )
    ),

  async execute(interaction) {

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'publish') {

      await interaction.deferReply({ ephemeral: true });

      const fileChoice = interaction.options.getString('type');
      let filePath;
      if (fileChoice === 'roles') {
        filePath = rolesFilePath;
      } else if (fileChoice === 'other') {
        filePath = otherFilePath;
      } else {
        return interaction.editReply('Invalid file option.');
      }

      const role = interaction.options.getRole('role');
      const newDescription = interaction.options.getString('description');

      try {
        let rolesData = [];

        try {
          const fileData = await fs.readFile(filePath, 'utf8');
          rolesData = JSON.parse(fileData);
        } catch (error) {

          if (error.code !== 'ENOENT') {
            console.error('Error reading file:', error);
            return interaction.editReply('There was an error reading the data.');
          }
        }

        const existingIndex = rolesData.findIndex(entry => entry.value === role.id);
        if (existingIndex !== -1) {
          rolesData[existingIndex].description = newDescription;
        } else {
          rolesData.push({
            label: role.name,
            value: role.id,
            description: newDescription
          });
        }

        await fs.writeFile(filePath, JSON.stringify(rolesData, null, 2));
        await interaction.editReply(`Role **${role.name}** has been updated successfully in the ${fileChoice} file!`);
      } catch (err) {
        console.error('Error updating file:', err);
        await interaction.editReply('There was an error updating the data.');
      }
    } else if (subcommand === 'remove') {
      const fileChoice = interaction.options.getString('type');
      let filePath;
      if (fileChoice === 'roles') {
        filePath = rolesFilePath;
      } else if (fileChoice === 'other') {
        filePath = otherFilePath;
      } else {
        return interaction.reply({ content: 'Invalid file option provided.', ephemeral: true });
      }

      const labelToRemove = interaction.options.getString('label');

      try {

        const fileData = await fs.readFile(filePath, 'utf8');
        let jsonData = JSON.parse(fileData);

        const index = jsonData.findIndex(entry => entry.label.toLowerCase() === labelToRemove.toLowerCase());
        if (index === -1) {
          return interaction.reply({
            content: `No entry found with label: **${labelToRemove}** in the ${fileChoice} file.`,
            ephemeral: true
          });
        }

        jsonData.splice(index, 1);
        await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8');

        return interaction.reply({
          content: `Successfully removed entry: **${labelToRemove}** from the ${fileChoice} file.`,
          ephemeral: true
        });
      } catch (error) {
        console.error(error);
        return interaction.reply({
          content: 'An error occurred while processing the JSON file.',
          ephemeral: true
        });
      }
    }
  },
};
