const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { WOMClient } = require('@wise-old-man/utils');
const { getInfoConfig } = require('../../utils/handlers/configHelper');
require('dotenv').config();
const { MAINTENANCE_MODE } = process.env;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clan-info')
    .setDescription('Displays clan information from the Wise Old Man API'),
  async execute(interaction) {

    if (MAINTENANCE_MODE === 'true') {
      const gifEmbed = new EmbedBuilder()
        .setTitle('Bot is under maintenance!')
        .setDescription('Try again later, or enjoy this masterpiece meanwhile:')
        .setImage('https://media.giphy.com/media/3o6ozlKdWlbxGthEiY/giphy.gif')
        .setColor(0xffcc00);

      await interaction.reply({ embeds: [gifEmbed], ephemeral: true });
      return;
    }


    try {
      const { guild } = interaction;
      const { clanMemberId, groupId } = await getInfoConfig();
      const client = new WOMClient();
      const group = await client.groups.getGroupDetails(groupId);
      const members = group.memberships;

      await guild.members.fetch();

      const clanMemberCount = guild.members.cache.filter(member =>
        member.roles.cache.has(clanMemberId)
      ).size;

      const embed = new EmbedBuilder()
        .setTitle('ℹ️ Information')
        .setDescription(group.description)
        .addFields({
          name: `▶️ ${group.name}`,
          value:
            `\u200B\n` +
            `**🪪 Group ID:** ${group.id.toString()}\n` +
            `**👤 Clan Chat:** ${group.clanChat || 'N/A'}\n` +
            `**🌐 Homeworld:** ${group.homeworld ? group.homeworld.toString() : 'N/A'}\n` +
            `**🕝 Creation Date:** ${new Date(group.createdAt).toLocaleDateString()}\n` +
            `**👥 Member Count:** ${group.memberCount.toString()}\n` +
            `**🔮 Discord Engagement:** ${100 * (clanMemberCount / members.length).toFixed(2)}%`
        })
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: 'There was an error fetching the clan information.',
        ephemeral: true,
      });
    }
  },
};
