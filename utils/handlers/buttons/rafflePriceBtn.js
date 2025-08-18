const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

async function rafflePriceBtnHanlder(interaction) {
   if (!interaction.isButton()) return;

   if (interaction.customId === 'raffle_price_btn') {
      const modal = new ModalBuilder()
         .setCustomId('ticket_modal')
         .setTitle('Ticket Price');

      const priceInput = new TextInputBuilder()
         .setCustomId('price_input')
         .setLabel('Set ticket price:')
         .setStyle(TextInputStyle.Short)
         .setPlaceholder('Type here...')
         .setRequired(true);

      const row = new ActionRowBuilder().addComponents(priceInput);

      modal.addComponents(row);

      await interaction.showModal(modal);
   }
};

module.exports = { rafflePriceBtnHanlder };
