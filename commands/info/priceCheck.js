const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const Fuse = require('fuse.js');

let itemMap = null;

const USER_AGENT = 'stackbot - @goodecoder on Discord';

async function fetchItemMap() {
   if (!itemMap) {

      const res = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping', {
         headers: { USER_AGENT }
      });

      itemMap = await res.json();
   }
   return itemMap;
}

function fuzzySearch(query, items) {
   const fuse = new Fuse(items, {
      keys: ['name'],
      threshold: 0.4
   });
   return fuse.search(query)?.[0]?.item;
}

function formatRelativeTime(unix) {
   const minutesAgo = Math.floor((Date.now() - unix * 1000) / 60000);
   return `(${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago)`;
}

module.exports = {
   category: 'fun',
   data: new SlashCommandBuilder()
      .setName('price')
      .setDescription('Check OSRS GE price data for an item')
      .addStringOption(opt =>
         opt.setName('item')
            .setDescription('Enter item name')
            .setRequired(true)
            .setAutocomplete(true)
      ),

   async autocomplete(interaction) {
      const focused = interaction.options.getFocused();
      const items = await fetchItemMap();

      const fuse = new Fuse(items, {
         keys: ['name'],
         threshold: 0.3
      });

      const results = focused.length
         ? fuse.search(focused).slice(0, 20).map(r => r.item.name)
         : items.slice(0, 20).map(item => item.name);

      await interaction.respond(
         results.map(name => ({ name, value: name }))
      );
   },

   async execute(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const itemName = interaction.options.getString('item');
      const items = await fetchItemMap();
      const match = fuzzySearch(itemName, items);

      if (!match) {
         return interaction.editReply(`❌ Couldn't find an item matching "${itemName}".`);
      }

      const priceRes = await fetch('https://prices.runescape.wiki/api/v1/osrs/latest', {
         headers: { USER_AGENT }
      });

      const priceData = await priceRes.json();
      const data = priceData.data[match.id];

      if (!data) {
         return interaction.editReply(`❌ No price data found for **${match.name}**.`);
      }

      const embed = new EmbedBuilder()
         .setTitle(`Showing details for ${match.name}:`)
         .setColor(0x2c2f33)
         .setDescription(
            `\`\`\`\n` +
            `Instant buy:   ${data.high.toLocaleString()} GP   ${formatRelativeTime(data.highTime)}\n` +
            `Instant sell:  ${data.low.toLocaleString()} GP   ${formatRelativeTime(data.lowTime)}\n` +
            `Daily volume:  ${data.volume?.toLocaleString() ?? 'N/A'}\n` +
            `\`\`\``
         )
         .setThumbnail(`https://oldschool.runescape.wiki/images/${encodeURIComponent(match.icon.replace(/ /g, '_'))}?c=1`);

      await interaction.editReply({ embeds: [embed] });
   }
};
