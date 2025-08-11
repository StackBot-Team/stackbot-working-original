const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

const userPingData = {};

module.exports = {
   data: new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Provides information about the user.'),

   async execute(interaction) {
      const userId = interaction.user.id;
      const userName = interaction.member.nickname;

      if (!userPingData[userId]) {
         userPingData[userId] = { firstPing: true };
         await interaction.reply(`Hi ${userName}! It's nice to meet you. I'm StackBot!`);
      } else {

         userPingData[userId].firstPing = false;
         const snippet = await getRandomRunescapeSnippet();
         await interaction.reply(`Welcome back, ${userName}! Did you know?\n\n${snippet}`);
      }
   },
};

async function getRandomRunescapeSnippet() {
   try {
      const randomResponse = await axios.get('https://oldschool.runescape.wiki/api.php', {
         params: {
            action: 'query',
            format: 'json',
            list: 'random',
            rnnamespace: 0,
            rnlimit: 1,
         }
      });
      const randomPage = randomResponse.data.query.random[0];
      const pageId = randomPage.id;

      const extractResponse = await axios.get('https://oldschool.runescape.wiki/api.php', {
         params: {
            action: 'query',
            format: 'json',
            prop: 'extracts',
            exintro: true,
            explaintext: true,
            pageids: pageId,
         }
      });
      const page = extractResponse.data.query.pages[pageId];
      const extract = page.extract;
      const snippet = extract.length > 200 ? extract.substring(0, 200) + '...' : extract;
      return snippet;
   } catch (error) {
      console.error(error);
      return "I couldn't fetch a RuneScape fact right now.";
   }
}
