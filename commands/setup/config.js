const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const { WOMClient } = require('@wise-old-man/utils');
const { sendOrUpdatePersistentButton } = require('../../utils/handlers/persistentButton.js');
const { sendOrUpdateLearnerButton } = require('../../utils/handlers/learnerInteractions.js');
const { publishMentorList } = require('../../utils/handlers/mentorPublisher.js');
const { getInfoConfig } = require('../../utils/handlers/configHelper.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configuration commands for various functionalities')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('clan')
        .setDescription("Set your OSRS clan by name")
        .addStringOption(option =>
          option.setName('clanname')
            .setDescription('Enter your OSRS clan name')
            .setRequired(true)
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('weekly_announce')
        .setDescription('Edit announcement configurations')
        .addSubcommand(subcommand =>
          subcommand
            .setName('botw')
            .setDescription('Edit BOTW Announcement configuration')
            .addStringOption(option =>
              option.setName('channelid')
                .setDescription('Enter the BOTW announcement channel ID')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('threadid')
                .setDescription('Enter the BOTW announcement thread ID')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('sotw')
            .setDescription('Edit SOTW Announcement configuration')
            .addStringOption(option =>
              option.setName('channelid')
                .setDescription('Enter the SOTW announcement channel ID')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('threadid')
                .setDescription('Enter the SOTW announcement thread ID')
                .setRequired(true)
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('joinroles')
        .setDescription('Edit guild roles configuration')
        .addStringOption(option =>
          option.setName('field')
            .setDescription('The field to update')
            .setRequired(true)
            .addChoices(
              { name: 'Clan Member Role ID', value: 'clanMemberId' },
              { name: 'Guest Role ID', value: 'guestRoleId' },
              { name: 'Pending Role ID', value: 'pendingMemberRoleId' }
            )
        )
        .addStringOption(option =>
          option.setName('value')
            .setDescription('@role or Role Id')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('publish_embeds')
        .setDescription('Configure channels for persistent embeds')
        .addStringOption(option =>
          option.setName('field')
            .setDescription('The field to update')
            .setRequired(true)
            .addChoices(
              { name: 'Rank Application Channel', value: 'rankApplicationId' },
              { name: 'Mentor Pings Channel', value: 'mentorPingsId' },
              { name: 'Mentor List Channel ID', value: 'mentorListId' }
            )
        )
        .addStringOption(option =>
          option.setName('value')
            .setDescription('#channel-name or channel id string')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('listeners')
        .setDescription('Store channel IDs the bot needs to function')
        .addStringOption(option =>
          option.setName('field')
            .setDescription('The channel field to update')
            .setRequired(true)
            .addChoices(
              { name: 'WOM Competition Updates', value: 'weekliesAnnouncementId' },
              { name: 'WOM Member Updates ', value: 'playerUpdateChannelId' },
              { name: 'Set RSN Channel', value: 'setRsnChannelId' },
              { name: 'Application Logs', value: 'applicationLogId' }
            )
        )
        .addStringOption(option =>
          option.setName('value')
            .setDescription('The channel: start typing with #channel-name')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const subcommandGroup = interaction.options.getSubcommandGroup(false);

    // Weekly Announcement commands
    if (subcommandGroup === 'weekly_announce') {
      let channelId = interaction.options.getString('channelid');
      if (channelId.startsWith('<#') && channelId.endsWith('>')) {
        channelId = channelId.slice(2, -1);
      }
      let threadId = interaction.options.getString('threadid');
      if (threadId.startsWith('<#') && threadId.endsWith('>')) {
        threadId = threadId.slice(2, -1);
      }
      const announcementType = subcommand;
      const configPath = path.join(__dirname, '../../data/weeklyConfig.json');
      try {
        const data = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(data);

        if (announcementType === 'botw') {
          config.botwAnnouncement = { channelId, threadId };
        } else if (announcementType === 'sotw') {
          config.sotwAnnouncement = { channelId, threadId };
        }

        await fs.writeFile(configPath, JSON.stringify(config, null, 4), 'utf-8');
        await interaction.reply(`The automated announcement for ${announcementType.toUpperCase()} will be sent to Channel <#${channelId}>, and Thread <#${threadId}>.`);
      } catch (error) {
        console.error('Error updating weekly announcement config:', error);
        await interaction.reply({ content: 'There was an error updating the announcement configuration.', ephemeral: true });
      }
      return;
    }

    if (subcommand === 'clan') {
      await interaction.deferReply({ ephemeral: true });
      const clanName = interaction.options.getString('clanname');
      const client = new WOMClient();
      try {
        const groups = await client.groups.searchGroups(clanName, { limit: 2 });
        if (!groups || groups.length === 0) {
          return interaction.editReply({ content: 'No clan found with that name.' });
        }
        const clanId = Number(groups[0].id);
        if (isNaN(clanId)) {
          return interaction.editReply({ content: 'The clan id returned is not a valid number.' });
        }
        const configPath = path.resolve(__dirname, '../../data/configInfo.json');
        const fileData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(fileData);
        config.groupId = clanId;
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
        return interaction.editReply({ content: `Your clan's Wise Old Man Group ID '${clanId}' has been saved successfully.` });
      } catch (error) {
        console.error('Error in clan configuration:', error);
        return interaction.editReply({ content: 'An error occurred while setting the clan. Please try again later.' });
      }
    }

    if (subcommand === 'guildroles') {
      const field = interaction.options.getString('field');
      let newValue = interaction.options.getString('value');

      const roleMentionMatch = newValue.match(/^<@&(\d+)>$/);
      if (roleMentionMatch) {
        newValue = roleMentionMatch[1];
      }

      if (field === 'groupId') {
        const parsedValue = Number(newValue);
        if (isNaN(parsedValue)) {
          return await interaction.reply({ content: 'The provided groupId is not a valid number.', ephemeral: true });
        }
        newValue = parsedValue;
      }

      const configPath = path.join(__dirname, '../../data/configInfo.json');
      /*
{ name: 'Clan Member Role ID', value: 'clanMemberId' },
              { name: 'Guest Role ID', value: 'guestRoleId' },
              { name: 'Pending Role ID', value: 'pendingMemberRoleId' }
      */
      const friendlyNames = {
        clanMemberId: "Clan Member",
        guestRoleId: "Guest",
        pendingMemberRoleId: "Pending Member"
      };
      const friendlyFieldName = friendlyNames[field] || field;
      try {
        const data = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(data);
        config[field] = newValue;
        await fs.writeFile(configPath, JSON.stringify(config, null, 4), 'utf-8');
        await interaction.reply(`Successfully updated \`${friendlyFieldName}\` role to <@&${roleMentionMatch[1]}>.`);
      } catch (error) {
        console.error('Error updating guild roles config:', error);
        await interaction.reply({ content: 'There was an error updating the configuration.', ephemeral: true });
      }
      return;
    }

    if (subcommand === 'publish_embeds') {
      const field = interaction.options.getString('field');
      const channelInput = interaction.options.getString('value');

      if (!interaction.guild) {
        return interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true });
      }

      let channel;
      if (channelInput.startsWith('<#') && channelInput.endsWith('>')) {
        const channelId = channelInput.slice(2, -1);
        channel = interaction.guild.channels.cache.get(channelId);
      } else {
        channel = interaction.guild.channels.cache.find(ch => ch.name.toLowerCase() === channelInput.toLowerCase());
      }
      if (!channel) {
        return interaction.reply({ content: `Channel "${channelInput}" not found. Please ensure you typed the correct channel name or mention.`, ephemeral: true });
      }
      const newValue = channel.id;
      const configPath = path.join(__dirname, '../../data/configInfo.json');
      try {
        const data = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(data);
        config[field] = newValue;
        await fs.writeFile(configPath, JSON.stringify(config, null, 4), 'utf-8');

        let configChannel;
        const { rankApplicationId, mentorPingsId, mentorListId } = await getInfoConfig();

        const friendlyNames = {
          rankApplicationId: "Application for Ranks",
          mentorPingsId: "Pings for Mentor Raids",
          mentorListId: "Mentor List"
        };

        if (field === 'mentorPingsId') {
          configChannel = await interaction.client.channels.fetch(mentorPingsId);
          await sendOrUpdateLearnerButton(configChannel, interaction.guild);
        } else if (field === 'rankApplicationId') {
          configChannel = await interaction.client.channels.fetch(rankApplicationId);
          await sendOrUpdatePersistentButton(configChannel);
        } else if (field === 'mentorListId') {
          configChannel = await interaction.client.channels.fetch(mentorListId);
          await publishMentorList(configChannel, interaction.guild);
        }

        const friendlyFieldName = friendlyNames[field] || field;

        await interaction.reply(`The \`${friendlyFieldName}\` embed, is now set to display in channel **${channelInput}**.`);
      } catch (error) {
        console.error('Error updating persistent embeds config:', error);
        await interaction.reply({ content: 'There was an error updating the configuration.', ephemeral: true });
      }
      return;
    }

    if (subcommand === 'listeners') {
      const field = interaction.options.getString('field');
      const channelInput = interaction.options.getString('value');

      if (!interaction.guild) {
        return interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true });
      }

      let channel;
      if (channelInput.startsWith('<#') && channelInput.endsWith('>')) {
        const channelId = channelInput.slice(2, -1);
        channel = interaction.guild.channels.cache.get(channelId);
      } else {
        channel = interaction.guild.channels.cache.find(ch => ch.name.toLowerCase() === channelInput.toLowerCase());
      }
      if (!channel) {
        return interaction.reply({ content: `Channel "${channelInput}" not found. Please ensure you typed the correct channel name or mention.`, ephemeral: true });
      }
      const newValue = channel.id;
      const configPath = path.join(__dirname, '../../data/configInfo.json');

      const friendlyNames = {
        playertUpdateChannelId: "Now listening to Wise Old Man's player updates in",
        setRsnChannelId: "The message command `?rsn` will now be limited to",
        applicationLogId: "Application Logs will now be been set to",
        weeklyAnnouncementId: "Now listening to Wise Old Man's competition updates in"
      };

      const friendlyFieldName = friendlyNames[field] || field;

      try {
        const data = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(data);
        config[field] = newValue;
        await fs.writeFile(configPath, JSON.stringify(config, null, 4), 'utf-8');
        await interaction.reply(`${friendlyFieldName} ${channelInput}.`);
      } catch (error) {
        console.error('Error updating listeners config:', error);
        await interaction.reply({ content: 'There was an error updating the configuration.', ephemeral: true });
      }
      return;
    }
  },
};
