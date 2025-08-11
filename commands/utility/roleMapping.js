const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const ROLE_MAPPING_FILE = path.resolve(__dirname, '../../data/role_mappings.json');

function loadRoleMappings() {
  if (fs.existsSync(ROLE_MAPPING_FILE)) {
    return JSON.parse(fs.readFileSync(ROLE_MAPPING_FILE, 'utf8'));
  }
  return {};
}

function saveRoleMappings(mappings) {
  fs.writeFileSync(ROLE_MAPPING_FILE, JSON.stringify(mappings, null, 4));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role_mapping')
    .setDescription('Manage RuneScape to Discord role mappings.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Map a RuneScape clan role to a Discord role.')
        .addStringOption(option =>
          option.setName('clan_role')
            .setDescription('The RuneScape clan role to map.')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('discord_role')
            .setDescription('The Discord role to map to.')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a RuneScape to Discord role mapping.')
        .addStringOption(option =>
          option.setName('clan_role')
            .setDescription('The RuneScape clan role to remove.')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('show')
        .setDescription('Show all RuneScape to Discord role mappings.')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const mappings = loadRoleMappings();

    if (subcommand === 'set') {
      const clanRole = interaction.options.getString('clan_role').toLowerCase();
      const discordRole = interaction.options.getRole('discord_role');

      mappings[clanRole] = discordRole.id;
      saveRoleMappings(mappings);

      await interaction.reply(
        `Successfully mapped Clan Chat rank name \`${clanRole}\` to Discord role \`${discordRole.name}\`.`
      );
    } else if (subcommand === 'remove') {
      const clanRole = interaction.options.getString('clan_role');

      if (!mappings[clanRole]) {
        await interaction.reply(`No mapping found for RuneScape clan role \`${clanRole}\`.`);
        return;
      }

      delete mappings[clanRole];
      saveRoleMappings(mappings);

      await interaction.reply(`Mapping for RuneScape clan role \`${clanRole}\` has been removed.`);
    } else if (subcommand === 'show') {
      if (Object.keys(mappings).length === 0) {
        await interaction.reply('No role mappings found.');
        return;
      }

      const mappingList = Object.entries(mappings)
        .map(([clanRole, discordRoleId]) => `\`${clanRole}\` → <@&${discordRoleId}>`)
        .join('\n');

      await interaction.reply(`**Current Role Mappings:**\n${mappingList}`);
    }
  },
};
