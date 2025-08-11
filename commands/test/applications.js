const { SlashCommandBuilder, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const persistentFile = path.join(__dirname, '../../data/persistentMessages.json');
const editQuestions = require('../../utils/handlers/editQuestions.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffapp')
    .setDescription('Application-related commands')
    .addSubcommand(sub =>
      sub.setName('deploy')
        .setDescription('Deploy the persistent application embed')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to deploy the application')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('edit')
        .setDescription('Make edits to the staff application questions')
    )
  //.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  ,

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel');

    if (subcommand === 'deploy') {

      const embed = new EmbedBuilder()
        .setTitle('Application for Staff Roles')
        .setDescription(`To apply for a role, please select one of the options below. You'll receive further instructions via DM.`)
        .setFooter({ text: 'StackBot' });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('application_dropdown')
        .setPlaceholder('Make a selection...')
        .addOptions([
          {
            label: 'Mod Application',
            value: 'mod_application',
          },
          {
            label: 'Event Coordinator',
            value: 'event_coordinator',
          }
        ]);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const message = await channel.send({ embeds: [embed], components: [row] });

      const json = fs.existsSync(persistentFile) ? JSON.parse(fs.readFileSync(persistentFile)) : {};
      json.applicationMessageId = message.id;
      json.channelId = channel.id;
      fs.writeFileSync(persistentFile, JSON.stringify(json, null, 2));

      //await interaction.reply({ content: 'Application embed deployed successfully.', ephemeral: true });
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'Application embed deployed successfully.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Application embed deployed successfully.', ephemeral: true });
      }

    } else if (subcommand === 'edit') {
      await editQuestions.execute(interaction);
    }
  }
};
