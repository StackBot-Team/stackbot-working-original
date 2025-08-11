const { EmbedBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { formatCurrency } = require('../../utils/handlers/formatCurrency');

function abbreviateNumber(num) {
  if (num < 100000) return num.toLocaleString();
  const si = [
    { value: 1E9, symbol: "B" },
    { value: 1E6, symbol: "M" },
    { value: 1E3, symbol: "K" }
  ];
  for (let i = 0; i < si.length; i++) {
    if (num >= si[i].value) {
      let result = (num / si[i].value).toFixed(1);
      if (result.endsWith('.0')) result = result.slice(0, -2);
      return result + si[i].symbol;
    }
  }
  return num.toString();
}
//let numParties = 1

function createCofferEmbed(coffer, overflow, overflowHolders, guild, shortFormat = false) {
  const total = coffer + overflow;
  const activeHolders = Object.entries(overflowHolders)
    .filter(([_, v]) => v > 0)
    .reduce((obj, [k, v]) => (obj[k] = v, obj), {});
  const numParties = Object.keys(activeHolders).length;
  const embed = new EmbedBuilder()
    .setTitle("Clan Bank Overview")
    .setColor(0x4682B4)
    .setThumbnail(guild.iconURL({ dynamic: true }))
    // .setDescription(`**Total Bank Value:** ${abbreviateNumber(total)}`)
    //.setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
    .addFields(
      // { name: "Coffer", value: abbreviateNumber(coffer), inline: true },
      { name: '<:Security_mobile:1394059293153824798> Total Bank', value: formatCurrency(total, shortFormat), inline: false },
      { name: "<:Voice_Private:1394059300145725481> Clan Hall Balance", value: formatCurrency(coffer, shortFormat), inline: true },
      { name: "<:Language_Mobile_white:1394059291434160188> Overflow Balance", value: formatCurrency(overflow, shortFormat), inline: true }
    )
    .setFooter({
      text: `Overflow held by ${numParties} ${numParties === 1 ? 'party' : 'parties'}`
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('coffer_holders')
      .setEmoji('1394059545646596308')
      .setLabel('Overflow Holders')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setEmoji('1394059294365978704')
      .setLabel('Logs')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/923095291018772481/1358220182039953509`),
    new ButtonBuilder()
      .setEmoji('1394094822108954717')
      .setCustomId('toggle_coffer_format')
      .setLabel('Toggle Format')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('overflow_btn')
      .setEmoji('1394059283188154480')
      .setStyle(ButtonStyle.Danger)

  );

  return { embed, row }
}

module.exports = { createCofferEmbed };
