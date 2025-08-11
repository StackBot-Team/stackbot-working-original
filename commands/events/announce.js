const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { handleBotwAnnouncement } = require('../../utils/weeklyEvents/handBotwAnnouncement.js');
const { handleSotwAnnounce } = require('../../utils/weeklyEvents/handleSotwAnnounce.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announcement')
    .setDescription('Manually trigger announcements.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('botw')
        .setDescription('Manually trigger the Boss of the Week announcement.')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Select the forum or text channel to send the announcement in')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildForum)
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('thread')
            .setDescription('Enter the thread name inside the forum (optional)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('sotw')
        .setDescription('Manually trigger the Skill of the Week announcement.')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Select the forum or text channel to send the announcement in')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildForum)
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('thread')
            .setDescription('Enter the thread name inside the forum (optional)')
            .setRequired(false)
        )
    ),

  async execute(interaction) {

    if (!interaction.member.permissions.has('MANAGE_GUILD')) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {

      const subcommand = interaction.options.getSubcommand();
      const targetChannel = interaction.options.getChannel('channel');
      const threadName = interaction.options.getString('thread');
      let threadChannel = targetChannel;

      if (targetChannel.type === ChannelType.GuildForum && threadName) {
        const threads = await targetChannel.threads.fetchActive();
        threadChannel = threads.threads.find(t => t.name.toLowerCase() === threadName.toLowerCase());

        if (!threadChannel) {
          return interaction.editReply({ content: `No active thread named "${threadName}" found in ${targetChannel}.` });
        }
      }

      const guild = interaction.guild;

      // Run the appropriate announcement based on the subcommand
      if (subcommand === 'botw') {
        await handleBotwAnnouncement(threadChannel, guild);
        await interaction.editReply({ content: `BOTW announcement sent to ${threadChannel}.` });
      } else if (subcommand === 'sotw') {
        await handleSotwAnnounce(threadChannel, guild);
        await interaction.editReply({ content: `SOTW announcement sent to ${threadChannel}.` });
      }
    } catch (error) {
      console.error('Error running announcement command:', error);
      await interaction.editReply({ content: 'An error occurred while sending the announcement.' });
    }
  }
};
