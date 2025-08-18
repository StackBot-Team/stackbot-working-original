const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getInfoConfig } = require('./configHelper');

const raffleDataPath = path.join(__dirname, '../../data/raffleEntries.json');
const recordPath = path.join(__dirname, '../../data/raffleStatsRecord.json');
const configPath = path.join(__dirname, '../../data/raffleConfig.json');

module.exports = {
   data: new SlashCommandBuilder()
      .setName('postrafflestats')
      .setDescription('Post a live raffle ticket count embed'),

   async execute(interaction) {
      const guild = interaction.guild;

      let raffleClosed = false;
      if (fs.existsSync(configPath)) {
         try {
            const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            raffleClosed = !!cfg.raffleClosed;
         } catch {

         }
      }

      if (!fs.existsSync(raffleDataPath)) {
         await interaction.reply({ content: 'No raffle data found.', ephemeral: true });
         return;
      }

      const data = JSON.parse(fs.readFileSync(raffleDataPath));
      const entries = Object.entries(data);

      if (entries.length === 0) {
         await interaction.reply({ content: 'No raffle entries found.', ephemeral: true });
         return;
      }

      let proceeds = 0;
      let totalParticipants = 0;
      let totalTickets = 0;

      const description = await Promise.all(entries.map(async ([userId, { tickets }]) => {
         const member = await guild.members.fetch(userId).catch(() => null);
         totalParticipants += 1
         totalTickets += tickets
         return member ? `${member} — \`${tickets} ticket(s)\`` : null;
      }));

      // TICKET PRICE
      const { ticketPrice } = await getInfoConfig();
      function formatPrice(value) {
         if (typeof value !== 'number' || isNaN(value)) return null;

         if (value >= 1_000_000_000) {
            return (value / 1_000_000_000).toFixed(value % 1_000_000_000 === 0 ? 0 : 1) + 'B';
         } else if (value >= 1_000_000) {
            return (value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1) + 'M';
         } else if (value >= 1_000) {
            return (value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1) + 'K';
         } else {
            return value.toString();
         }
      }
      proceeds = totalTickets * ticketPrice;

      const embed = new EmbedBuilder()
         .setTitle('<:blue_card:1394925345202901012> Raffle Entries')
         .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 2048 }))
         .setDescription(description.filter(Boolean).join('\n'))
         .setColor(0x3498db)
         .setTimestamp();

      embed.addFields(
         { name: '<:Invite:1394919139545448459> Participants', value: `${totalParticipants}`, inline: true },
         { name: '<:Awards:1394927803861827666> Total Tickets', value: `${totalTickets}`, inline: true },
         { name: '<:Voice_Private_Event1:1394925300453998593> Proceeds', value: `${formatPrice(proceeds)} gp`, inline: true }
      );
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
         new ButtonBuilder()
            .setCustomId('raffle_price_btn')
            .setEmoji('1394059300145725481')
            .setLabel('Ticket Price')
            .setStyle(ButtonStyle.Primary)
      )

      const message = await interaction.channel.send({
         embeds: [embed],
         components: [row]
      });


      const record = {
         messageId: message.id,
         channelId: interaction.channel.id
      };

      fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
      await interaction.reply({ content: 'Raffle entry board posted.', ephemeral: true });
   }
};
