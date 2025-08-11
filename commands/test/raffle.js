const { SlashCommandBuilder, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const persistentFile = path.join(__dirname, '../../data/rafflePersistent.json');
//const editQuestions = require('../../utils/handlers/editQuestions.js');
const postRaffleStats = require('../../utils/handlers/postRaffleStats.js')
const refreshRaffleStats = require('../../utils/handlers/refreshRaffleStats.js')
const draw = require('../../utils/handlers/draw.js');
const refreshPotluckBoard = require('../../utils/handlers/refreshPotluckBoard.js');
const postPotluckBoard = require('../../utils/handlers/postPotluckBoard.js');
const entry = require('../../utils/handlers/entry.js');
const reset = require('../../utils/handlers/resetRaffle.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raffle')
    .setDescription('Deploy the Raffle & PotLuck application')
    .addSubcommand(sub =>
      sub.setName('application')
        .setDescription('Deploys the Raffle & Potluck application')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to deploy the application')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('draw')
        .setDescription('Draws the winning raffle entry.')
    )
    .addSubcommand(sub =>
      sub
        .setName('post_raffleboard')
        .setDescription('Post a list of raffle entries.')
    )
    .addSubcommand(sub =>
      sub
        .setName('update_raffleboard')
        .setDescription('Updates list of raffle entries.')
    )
    .addSubcommand(sub =>
      sub
        .setName('post_potluckboard')
        .setDescription('Posts a list of potluck entries.')
    )
    .addSubcommand(sub =>
      sub
        .setName('update_potluckboard')
        .setDescription('Updates list of potluck entries.')
    )
    .addSubcommandGroup(group =>
      group
        .setName('entry')
        .setDescription('Manage raffle entries')
        .addSubcommand(sub =>
          sub
            .setName('add')
            .setDescription('Add tickets to a user')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
            .addIntegerOption(opt => opt.setName('tickets').setDescription('How many tickets').setMinValue(1).setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Remove tickets from a user')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
            .addIntegerOption(opt => opt.setName('tickets').setDescription('How many tickets').setMinValue(1).setRequired(true))
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('reset')
        .setDescription('Resets the raffle and potluck entries')
    )
  ,

  async execute(interaction) {
    // if (true) {
    //   const gifEmbed = new EmbedBuilder()
    //     .setTitle('Feature is under maintenance!')
    //     .setDescription('Try again later, or enjoy this masterpiece meanwhile:')
    //     .setImage('https://media.giphy.com/media/3o6ozlKdWlbxGthEiY/giphy.gif')
    //     .setColor(0xffcc00);

    //   await interaction.reply({ embeds: [gifEmbed], ephemeral: true });
    //   return;
    // }
    const subcommand = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel');
    const subcommandGroup = interaction.options.getSubcommandGroup(false);

    if (subcommand === 'application') {

      const embed = new EmbedBuilder()
        .setTitle('Raffle & PotLuck Form')
        .setDescription(`To enter, please select one of the options below. Further instructions will be sent via DM.`)
        .setFooter({ text: 'StackBot' });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('raffle_dropdown')
        .setPlaceholder('Choose an option...')
        .addOptions([
          {
            label: 'Enter Raffle',
            value: 'raffle_application',
            description: 'Apply to enter the raffle'
          },
          {
            label: 'Enter PotLuck',
            value: 'potluck_application',
            description: 'Apply to join the potluck'
          }
        ]);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const message = await channel.send({ embeds: [embed], components: [row] });

      // Save to persistent storage
      const json = fs.existsSync(persistentFile) ? JSON.parse(fs.readFileSync(persistentFile)) : {};
      json.raffleMessageId = message.id;
      json.raffleChannelId = channel.id;
      fs.writeFileSync(persistentFile, JSON.stringify(json, null, 2));

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'Raffle & PotLuck application embed deployed successfully.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Raffle & PotLuck application embed deployed successfully.', ephemeral: true });
      }

    } else if (subcommand === 'draw') {
      await draw.execute(interaction);
    } else if (subcommand === 'post_raffleboard') {
      await postRaffleStats.execute(interaction);
    } else if (subcommand === 'update_raffleboard') {
      await refreshRaffleStats.execute(interaction);
    } else if (subcommand === 'post_potluckboard') {
      await postPotluckBoard.execute(interaction);
    } else if (subcommand === 'update_potluckboard') {
      await refreshPotluckBoard.execute(interaction);
    } else if (subcommandGroup === 'entry') {
      await entry.execute(interaction);
    } else if (subcommand === 'reset') {
      await reset.execute(interaction);
    }
  }
};
