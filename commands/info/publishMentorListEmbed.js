const { SlashCommandBuilder } = require('discord.js');
const { publishMentorList } = require('../../utils/handlers/mentorPublisher.js');
const { getInfoConfig } = require('../../utils/handlers/configHelper.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update-mentorlist')
    .setDescription('Publishes the Mentor List.'),


  async execute(interaction) {
    let channel;
    const { mentorListId } = await getInfoConfig();

    if (mentorListId) {
      channel = await interaction.client.channels.fetch(mentorListId);
      await publishMentorList(channel, interaction.guild);
    } else {
      interaction.reply({ content: `Please configure the channel ID for the embed!`, ephemeral: true });
    }

    interaction.reply({ content: `Published embed!`, ephemeral: true })
  }

}

