const { ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const raffleDataPath = path.join(__dirname, '../../../data/raffleEntries.json');
const recordPath = path.join(__dirname, '../../../data/raffleStatsRecord.json');
const configPath = path.join(__dirname, '../../../data/raffleConfig.json');

async function raffleEndBtnHandler(interaction) {

   let config = { raffleClosed: false };
   if (fs.existsSync(configPath)) {
      try {
         config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch {

      }
   }

   config.raffleClosed = !config.raffleClosed;
   fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

   const replyMsg = config.raffleClosed
      ? '<:Edit_Security_Actions:1394099688805761064> Raffle submissions have been stopped.'
      : '<:Checkmark:1395170304489295942> Raffle has been opened for submissons again.';
   await interaction.reply({ content: replyMsg, flags: MessageFlags.Ephemeral });

   if (fs.existsSync(recordPath)) {
      try {
         const { channelId, messageId } = JSON.parse(fs.readFileSync(recordPath, 'utf-8'));
         const channel = await interaction.guild.channels.fetch(channelId);
         const message = await channel.messages.fetch(messageId);

         const reloadBtn = new ButtonBuilder()
            .setCustomId('reload_btn')
            .setEmoji('1394919143714717709')
            .setLabel('Refresh')
            .setStyle(ButtonStyle.Secondary);

         const drawBtn = new ButtonBuilder()
            .setCustomId('draw_btn')
            .setEmoji('1394919137859469424')
            .setLabel('Draw')
            .setStyle(ButtonStyle.Success);

         const endBtn = new ButtonBuilder()
            .setCustomId('end_btn')
            .setEmoji(config.raffleClosed ? '1394059300145725481' : '1394059300145725481')
            .setLabel(config.raffleClosed ? 'Open Raffle' : 'End Raffle')
            .setStyle(config.raffleClosed ? ButtonStyle.Primary : ButtonStyle.Danger);

         const priceBtn = new ButtonBuilder()
            .setCustomId('raffle_price_btn')
            .setEmoji('1394059300145725481')
            .setLabel('Ticket Price')
            .setStyle(ButtonStyle.Primary)

         const row = new ActionRowBuilder().addComponents(reloadBtn, drawBtn, endBtn, priceBtn);

         await message.edit({ components: [row] });
      } catch (err) {
         console.error('Failed to update original raffle message:', err);
      }
   }



}

module.exports = { raffleEndBtnHandler };