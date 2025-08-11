const { SlashCommandBuilder } = require('discord.js');
const { WOMClient } = require('@wise-old-man/utils');
const { getInfoConfig } = require('../../utils/handlers/configHelper.js');
const womClient = new WOMClient();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete_event')
    .setDescription('Delete an event from Discord and Wise Old Man.')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('The type of event to delete (Boss or Skill)')
        .setRequired(true)
        .addChoices(
          { name: 'Boss', value: 'Boss of the Week' },
          { name: 'Skill', value: 'Skill of the Week' },
          // { name: 'Test', value: 'Test'}
        )
    )
    .addStringOption(option =>
      option
        .setName('verification')
        .setDescription('Enter your verification code')
        .setRequired(true)
    ),
  async execute(interaction) {

    const { groupId } = await getInfoConfig();
    const verificationCode = interaction.options.getString('verification');
    await interaction.deferReply();

    const eventType = interaction.options.getString('type');

    try {

      const competitions = await womClient.groups.getGroupCompetitions(groupId, { limit: 5 });
      const competition = competitions.find(c => c.title.startsWith(eventType) && new Date(c.startsAt) > new Date());

      console.log(competition);

      if (!competition) {
        return interaction.editReply(`No upcoming event found for type: ${eventType}.`);
      }

      // Delete the competition on wom
      await womClient.competitions.deleteCompetition(competition.id, verificationCode);

      const guildEvents = await interaction.guild.scheduledEvents.fetch();

      const discordEvent = guildEvents.find(event => event.name.startsWith(eventType) && event.status === 1);

      if (!discordEvent) {
        return interaction.editReply({
          content: 'No scheduled Discord events were found matching the criteria.',
          ephemeral: true,
        });
      }

      // Find and delete the discord event
      await discordEvent.delete();

      function formatTitle(boss) {
        return boss
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }

      let prettyBossName = formatTitle(competition.metric);

      return interaction.editReply({
        embeds: [
          {
            title: 'Event Deleted',
            description: `The event **${competition.title} - ${prettyBossName}** has been successfully deleted from both Discord and Wise Old Man.`,
            color: 0x00ff00,
            footer: { text: `⚠️Don't forget to reschedule!` }
          },
        ],
      });
    } catch (error) {
      console.error(error);
      return interaction.editReply(
        'An error occurred while trying to delete the event. Please try again later.'
      );
    }
  },
};
