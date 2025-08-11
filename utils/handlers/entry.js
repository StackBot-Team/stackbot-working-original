const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const raffleDataPath = path.join(__dirname, '../../data/raffleEntries.json');
const MAX_TICKETS_PER_USER = 5;
//const TICKET_LIMIT = 100;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raffle_entry')
    .setDescription('Manage raffle entries manually.')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add raffle tickets to a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to give tickets to')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('tickets')
            .setDescription('Number of tickets to add')
            .setMinValue(1)
            .setMaxValue(MAX_TICKETS_PER_USER)
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove raffle tickets from a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to remove tickets from')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('tickets')
            .setDescription('Number of tickets to remove')
            .setMinValue(1)
            .setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const ticketDelta = interaction.options.getInteger('tickets');

    const data = JSON.parse(fs.readFileSync(raffleDataPath));
    const current = data[user.id]?.tickets || 0;
    //const totalClaimed = Object.values(data).reduce((sum, v) => sum + (v.tickets || 0), 0);
    //const remaining = TICKET_LIMIT - totalClaimed;

    const embed = new EmbedBuilder().setColor(0x5865f2);

    if (subcommand === 'add') {
      if (current + ticketDelta > MAX_TICKETS_PER_USER) {
        embed
          .setTitle('❌ Ticket Limit Exceeded')
          .setDescription(`${user} already has **${current}** ticket(s).\nMax per user is **${MAX_TICKETS_PER_USER}**.`);
        return await interaction.reply({ embeds: [embed], ephemeral: false });
      }

      // if (ticketDelta > remaining) {
      //   embed
      //     .setTitle('❌ Not Enough Tickets Left')
      //     .setDescription(`Only **${remaining}** ticket(s) remain in the raffle.`);
      //   return await interaction.reply({ embeds: [embed], ephemeral: false });
      // }

      data[user.id] = {
        tickets: current + ticketDelta
      };
      fs.writeFileSync(raffleDataPath, JSON.stringify(data, null, 2));

      embed
        .setTitle('✅ Ticket Entry Updated')
        .setDescription(`Added **${ticketDelta}** ticket(s) for ${user}.\nNew total: **${data[user.id].tickets}**.`);
      return await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (subcommand === 'remove') {
      if (current === 0) {
        embed
          .setTitle('⚠️ No Tickets Found')
          .setDescription(`${user} has no tickets to remove.`);
        return await interaction.reply({ embeds: [embed], ephemeral: false });
      }

      const newTicketCount = current - ticketDelta;

      if (newTicketCount <= 0) {
        delete data[user.id];
        fs.writeFileSync(raffleDataPath, JSON.stringify(data, null, 2));
        embed
          .setTitle('✅ Entry Removed')
          .setDescription(`Removed all tickets from ${user}.`);
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        data[user.id].tickets = newTicketCount;
        fs.writeFileSync(raffleDataPath, JSON.stringify(data, null, 2));
        embed
          .setTitle('✅ Tickets Removed')
          .setDescription(`Removed **${ticketDelta}** ticket(s) from ${user}.\nRemaining: **${newTicketCount}**.`);
        return await interaction.reply({ embeds: [embed], ephemeral: false });
      }
    }
  }
};
