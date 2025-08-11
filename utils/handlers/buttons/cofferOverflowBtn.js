const { MessageFlags, EmbedBuilder } = require('discord.js');
const { getInfoConfig } = require('../configHelper');

//async function overFlowBtnHandler(interaction) {
//   await interaction.reply({ content: '<:Warning:1395170298197966981> Your in game coffer transactions will treat deposits as overflow withdrawals amd your withdrawals as overflow deposits!', flags: MessageFlags.Ephemeral });
//}

async function overFlowBtnHandler(interaction) {
  const { overflowRoleId } = await getInfoConfig();

  const gifEmbed = new EmbedBuilder()
    //.setTitle('Bot is under maintenance!')
    //.setDescription('Try again later, or enjoy this masterpiece meanwhile:')
    .setImage('https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNDlrbzdiZ3hwM252NWZ1OWJ6bXNlMHRvamRnZmIwbDFzN3RzMWoxZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/8wwQ8Xo0m4WWC8y3uk/giphy.gif')
    .setColor(0xffcc00);

  const member = interaction.member;

  if (!member) {
    return interaction.reply({ content: 'Member data unavailable.', flags: MessageFlags.Ephemeral });
  }

  try {
    if (member.roles.cache.has(overflowRoleId)) {
      await member.roles.remove(overflowRoleId);
      await interaction.reply({ embeds: [gifEmbed], content: '<:Warning:1395170298197966981> Your in game coffer transactions will be treated as typical coffer transactions.', flags: MessageFlags.Ephemeral });
    } else {
      await member.roles.add(overflowRoleId);
      await interaction.reply({ embeds: [gifEmbed], content: '<:Warning:1395170298197966981> Your in game coffer transactions will treat deposits as overflow withdrawals and your withdrawals as overflow deposits!', flags: MessageFlags.Ephemeral });
    }
  } catch (error) {
    console.error('Error toggling role:', error);
    await interaction.reply({ content: '<:Engaged_in_suspected_spam_activ:1395170301498626058> Unable to toggle role.', flags: MessageFlags.Ephemeral });
  }


  //await interaction.reply({ embeds: [gifEmbed], flags: MessageFlags.Ephemeral })
}

module.exports = { overFlowBtnHandler };

