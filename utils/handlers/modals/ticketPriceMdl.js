const fs = require('fs').promises;
const path = require('path');
const parseAbbreviatedPrice = require('../../parsePrice.js');
const { MessageFlags } = require('discord.js')

async function tickPriceModalHandler(interaction) {

   const input = interaction.fields.getTextInputValue('price_input');
   const parsed = parseAbbreviatedPrice(input);

   if (parsed === null) {
      return interaction.reply({
         content: '<:Engaged_in_suspected_spam_activ:1395170301498626058> Invalid price format. Use numbers like `5k`, `2m`, `1000`.',
         flags: MessageFlags.Ephemeral,
      });
   }

   const filePath = path.join(__dirname, '../../../data/configInfo.json');

   try {
      let data = {};
      try {
         const content = await fs.readFile(filePath, 'utf8');
         data = JSON.parse(content);
      } catch (err) {
         if (err.code !== 'ENOENT') throw err;
      }

      data['ticketPrice'] = parsed;

      await fs.writeFile(filePath, JSON.stringify(data, null, 2));

      await interaction.reply({
         content: `The cost of raffle tickets are now set to ${parsed.toLocaleString()} gp.`,
         flags: MessageFlags.Ephemeral,
      });
   } catch (err) {
      console.error('Error writing JSON:', err);
      await interaction.reply({
         content: '<:Warning:1395170298197966981> Something went wrong while saving.',
         flags: MessageFlags.Ephemeral,
      });
   }

};

module.exports = { tickPriceModalHandler };
