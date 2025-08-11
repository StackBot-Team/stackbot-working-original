const { EmbedBuilder, MessageFlags } = require('discord.js');
const { readData, getOverflowTotal } = require('../../../commands/info/clanCofferTest');

async function handleCofferHolders(interaction) {
  if (!interaction.isButton() || interaction.customId !== 'coffer_holders') return;

  const data = await readData();
  const holders = data.overflowHolders || {};
  const total = getOverflowTotal(holders);

  const breakdown = new EmbedBuilder()
    .setTitle('Overflow Holder Breakdown')
    .setColor('#1abc9c');

  if (Object.keys(holders).length === 0) {
    breakdown.setDescription('No overflow holders at the moment.');
  } else {
    for (const [userId, amount] of Object.entries(holders)) {

      const member = await interaction.guild.members
        .fetch(userId)
        .catch(() => null);
      const name = member?.displayName || member?.user.username || userId;
      breakdown.addFields({
        name,
        value: amount.toLocaleString(),
        inline: true
      });
    }
  }

  breakdown.setFooter({ text: `Total Overflow: ${total.toLocaleString()}` });

  await interaction.reply({ embeds: [breakdown], flags: MessageFlags.Ephemeral });
}

module.exports = { handleCofferHolders };