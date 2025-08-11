const { MessageFlags, EmbedBuilder } = require("discord.js");
const { readData, writeData, getOverflowTotal, updatePublishedEmbed } = require('../../../commands/info/clanCofferTest');

async function handleToggleBtn(interaction) {
  await interaction.deferUpdate();

  const data = await readData();

  // Flip the shortFormat flag
  data.shortFormat = !data.shortFormat;

  await writeData(data);
  const overflowTotal = getOverflowTotal(data.overflowHolders);

  try {
    await updatePublishedEmbed(data, interaction);
  } catch (error) {
    console.error('Error updating coffer embed after toggle:', error);
  }

  //const confirm = new EmbedBuilder()
  //   .setTitle('Format Toggled')
  //   .setDescription(`Now using **${data.shortFormat ? 'short' : 'long'}** number format.`)
  //   .setColor('#3498db')
  //   .setTimestamp();

  //await interaction.followUp({ embeds: [confirm], flags: MessageFlags.Ephemeral });
}


module.exports = { handleToggleBtn };