const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const { WOMClient, Boss } = require('@wise-old-man/utils');
const fs = require('fs');
const path = require('path');

const bossOptions = Object.values(Boss);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configure_botw')
    .setDescription('Configure BOTW competition settings.'),
  async execute(interaction) {


    if (interaction.client.activeCollectors) {
      interaction.client.activeCollectors.forEach(collector => collector.stop('New collector started'));
    }
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('configure_botw_add_boss').setLabel('Exclude Boss').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('configure_botw_remove_boss').setLabel('Remove Exclusion').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('configure_botw_toggle_expert_raids').setLabel('Toggle Expert Raids').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('configure_botw_view_excluded_bosses').setLabel('View Excluded Bosses').setStyle(ButtonStyle.Secondary),
        //new ButtonBuilder().setCustomId('toggle_joint_competitions').setLabel('Joint/Separate Competitions').setStyle(ButtonStyle.Secondary),
      );

    await interaction.reply({ content: 'Choose an option:', components: [row], ephemeral: false });
  },

  async buttonHandler(interaction) {


    const excludedBossesPath = path.resolve(__dirname, '../../data/excludedBosses.json');
    //const configPath = path.resolve(__dirname, '../../data/config.json');
    const configPath = path.resolve(__dirname, '../../data/botwConfig.json');


    if (!interaction.message.interaction || interaction.user.id !== interaction.message.interaction.user.id) {
      await interaction.reply({
        content: "Button interaction is limited to the command issuer.",
        ephemeral: true
      });

      return; // Do nothing for unauthorized users
    }

    if (!fs.existsSync(configPath)) {
      //console.warn('Failed to load config.json. Using default configuration.');
      const defaultConfig = {
        expertRaidsEnabled: false,
        jointCompetitions: false
      };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    }


    switch (interaction.customId) {
      case 'configure_botw_add_boss':
      case 'configure_botw_remove_boss': {
        const action = interaction.customId === 'configure_botw_add_boss' ? 'add' : 'remove';
        const modal = new ModalBuilder()
          .setCustomId(`configure_botw_${action}_boss_modal`)
          .setTitle(`${action === 'add' ? 'Add' : 'Remove'} Boss`)
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('boss_name')
                .setLabel('Boss Name')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter boss name (e.g., Callisto)')
                .setRequired(true),
            )
          );

        await interaction.showModal(modal);
        break;
      }

      case 'configure_botw_toggle_expert_raids': {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const expertRaids = ['tombs_of_amascut_expert', 'theatre_of_blood_hard_mode', 'chambers_of_xeric_challenge_mode'];

        let excludedBosses = [];
        if (fs.existsSync(excludedBossesPath)) {
          excludedBosses = JSON.parse(fs.readFileSync(excludedBossesPath, 'utf8'));
        } else {
          fs.writeFileSync(excludedBossesPath, JSON.stringify([]));
        }

        if (config.expertRaidsEnabled) {

          config.expertRaidsEnabled = false;
          expertRaids.forEach(boss => {
            if (!excludedBosses.includes(boss)) excludedBosses.push(boss);
          });
        } else {

          config.expertRaidsEnabled = true;
          expertRaids.forEach(boss => {
            const index = excludedBosses.indexOf(boss);
            if (index !== -1) excludedBosses.splice(index, 1);
          });
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        fs.writeFileSync(excludedBossesPath, JSON.stringify(excludedBosses, null, 2));

        const embed = new EmbedBuilder()
          .setTitle('Expert Raids Toggled')
          .setDescription(`Expert raids are now **${config.expertRaidsEnabled ? 'enabled' : 'disabled'}**.`)
          .setColor(config.expertRaidsEnabled ? 'Green' : 'Red')
          .setFooter({ text: 'command: /config_botw' });

        await interaction.reply({ embeds: [embed], ephemeral: false });
        break;
      }


      case 'configure_botw_view_excluded_bosses': {
        let excludedBosses;
        try {
          excludedBosses = JSON.parse(fs.readFileSync(excludedBossesPath, 'utf8'));
        } catch (error) {
          console.error('Error reading the JSON file:', error);
          return interaction.reply({ content: 'There was an error reading the excluded bosses list.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('BOTW Exclusions')
          .setDescription('Here is the list of bosses currently excluded when picking a random boss:')
          .addFields({
            name: 'Bosses',
            value: excludedBosses.length > 0
              ? excludedBosses.map(boss => `- ${boss.replace(/_/g, ' ')}`).join('\n')
              : 'No bosses are currently excluded.',
          })
          .setFooter({ text: 'command: /config_botw' })
        //.setFooter({ text: 'Requested by ' + interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed], ephemeral: false });
        break;
      }
    }

  },

  async modalHandler(interaction) {
    const bossNameInput = interaction.fields.getTextInputValue('boss_name').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const action = interaction.customId.includes('add') ? 'add' : 'remove';

    // const matchedBoss = bossOptions.find(boss => boss.toLowerCase() === bossNameInput || boss.replace(/_/g, '').toLowerCase() === bossNameInput);

    const matchedBoss = bossOptions.find(boss => {
      const normalizedBoss = boss.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const normalizedInput = bossNameInput.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      return normalizedBoss === normalizedInput;
    });

    if (!matchedBoss) {
      await interaction.reply({ content: 'Invalid boss name. Please try again.', ephemeral: true });
      return;
    }

    const excludedBossesPath = path.resolve(__dirname, '../../data/excludedBosses.json');
    const excludedBosses = JSON.parse(fs.readFileSync(excludedBossesPath, 'utf8'));

    if (action === 'add') {
      if (!excludedBosses.includes(matchedBoss)) excludedBosses.push(matchedBoss);
    } else {
      const index = excludedBosses.indexOf(matchedBoss);
      if (index !== -1) excludedBosses.splice(index, 1);
    }

    fs.writeFileSync(excludedBossesPath, JSON.stringify(excludedBosses, null, 2));

    const embed = new EmbedBuilder()
      .setTitle(`${action === 'add' ? 'Excluded' : 'Added'} Boss`)
      .setDescription(`**${matchedBoss.replace(/_/g, ' ')}** will ${action === 'add' ? 'no longer appear in Boss of the Week.' : 'now appear in Boss of the Week.'}`)
      .setColor(action === 'add' ? 'Green' : 'Red')
      .setFooter({ text: 'command: /config_botw' })
    await interaction.reply({ embeds: [embed], ephemeral: false });
  },
};
