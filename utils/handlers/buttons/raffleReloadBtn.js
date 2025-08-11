const { ActionRowBuilder, ButtonStyle, ButtonBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const raffleDataPath = path.join(__dirname, '../../../data/raffleEntries.json');
const recordPath = path.join(__dirname, '../../../data/raffleStatsRecord.json');
const configPath = path.join(__dirname, '../../../data/raffleConfig.json');

async function raffleReloadHandler(interaction) {

  if (!fs.existsSync(recordPath)) {
    return interaction.reply({ content: 'No raffle board to refresh.', flags: MessageFlags.Ephemeral });
  }

  let raffleClosed = false;
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      raffleClosed = !!cfg.raffleClosed;
    } catch {

    }
  }

  const { channelId, messageId } = JSON.parse(fs.readFileSync(recordPath));
  const channel = await interaction.guild.channels.fetch(channelId);
  const message = await channel.messages.fetch(messageId);
  if (!message) {
    return interaction.reply({ content: 'Could not find the raffle board.', flags: MessageFlags.Ephemeral });
  }

  // rebuild the entries embed
  const data = JSON.parse(fs.readFileSync(raffleDataPath));
  const entries = Object.entries(data);
  let totalTickets = 0;
  let totalParticipants = 0
  const lines = [];
  for (const [userId, { tickets }] of entries) {
    totalTickets += tickets;
    totalParticipants += 1;
    lines.push(`<@${userId}> — \`${tickets} ticket(s)\``);
  }
  const totalValue = (totalTickets * 1).toFixed(1);
  const embed = new EmbedBuilder()
    .setTitle('<:blue_card:1394925345202901012> Raffle Entries')
    .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 2048 }))
    .setDescription(`${lines.join('\n')}\n\n`)
    .setColor(0x3498db)
    .setTimestamp();

  embed.addFields(
    { name: '<:Invite:1394919139545448459> Participants', value: `${totalParticipants}`, inline: true },
    { name: '<:Awards:1394927803861827666> Total Tickets', value: `${totalTickets}`, inline: true },
    { name: '<:Voice_Private_Event1:1394925300453998593> Proceeds', value: `${totalValue.toLocaleString()}M gp`, inline: true }
  );

  const replyMsg = 'Raffle stats refreshed.'
  await interaction.reply({ content: replyMsg, flags: MessageFlags.Ephemeral });

  // rebuild the same button row
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('reload_btn')
      .setEmoji('1394919143714717709')
      .setLabel('Refresh')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('draw_btn')
      .setEmoji('1394919137859469424')
      .setLabel('Draw')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('end_btn')
      .setEmoji('1394059300145725481')
      .setLabel(raffleClosed ? 'Open Raffle' : 'End Raffle')
      .setStyle(raffleClosed ? ButtonStyle.Primary : ButtonStyle.Danger),
  );

  await message.edit({ embeds: [embed], components: [row] });

  //await interaction.reply({ content: '🔄 Raffle stats refreshed.', ephemeral: true });


}

module.exports = { raffleReloadHandler };