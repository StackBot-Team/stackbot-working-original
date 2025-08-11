const { getInfoConfig } = require('./configHelper.js');
const {
  EmbedBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const QUESTIONS_PATH = path.join(__dirname, '../../data/questions.json');
const userSelections = new Map();
const inProgress = new Set();

const APP_TYPE_DISPLAY = {
  mod_application: 'Moderator',
  event_coordinator: 'Event Coordinator'
};

function buildDropdown() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('application_dropdown')
    .setPlaceholder('Make a selection...')
    .setMinValues(0)
    .setMaxValues(1)
    .addOptions([
      { label: 'Mod Application', value: 'mod_application' },
      { label: 'Event Coordinator', value: 'event_coordinator' }
    ]);
  return new ActionRowBuilder().addComponents(menu);
}

async function handleApplicationDropdown(interaction) {
  // Prevent concurrent applications
  if (inProgress.has(interaction.user.id)) {
    return interaction.reply({
      content: 'You already have an application in progress—please finish or cancel it first.',
      ephemeral: true
    });
  }
  inProgress.add(interaction.user.id);
  await interaction.deferReply({ ephemeral: true });

  const option = interaction.values[0];
  const user = interaction.user;
  userSelections.set(user.id, option);

  // Load questions for the selected application type
  let questions;
  try {
    const data = await fs.readFile(QUESTIONS_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    questions = parsed[option];
    if (!Array.isArray(questions)) throw new Error('Invalid question set');
  } catch (err) {
    console.error('Failed to load questions:', err);
    inProgress.delete(user.id);
    return interaction.editReply({
      content: "Application unselected. You can reselect it to apply again."
    });
  }

  let dm;
  try {
    dm = await user.createDM();
  } catch (err) {
    console.error('Cannot open DM:', err);
    inProgress.delete(user.id);
    return interaction.editReply({ content: "I can't DM you. Check your privacy settings." });
  }

  await dm.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Application Started')
        .setDescription(`You're starting the **${APP_TYPE_DISPLAY[option]}** application.`)
        .setColor(0x5865F2)
        .setTimestamp()
    ]
  });

  await interaction.message.edit({ components: [buildDropdown()] });

  const total = questions.length;
  const responses = [];

  for (let i = 0; i < total; i++) {
    const question = questions[i];
    const number = i + 1;

    await dm.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Question ${number} of ${total}`)
          .setDescription(question)
          .setFooter({ text: "Reply within 60 seconds (or type 'cancel' to exit)." })
      ]
    });

    const collected = await dm.awaitMessages({
      filter: m => m.author.id === user.id,
      max: 1,
      time: 60000,
      errors: ['time']
    }).catch(() => null);

    if (!collected) {
      await dm.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Timeout')
            .setDescription('You ran out of time. Please start again.')
            .setColor(0xe74c3c)
        ]
      });
      inProgress.delete(user.id);
      return interaction.editReply({ content: 'Application timed out.' });
    }

    const answer = collected.first().content.trim();

    if (answer.toLowerCase() === 'cancel') {
      await dm.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Application Canceled')
            .setDescription('Feel free to restart the application anytime.')
            .setColor(0xe74c3c)
        ]
      });
      inProgress.delete(user.id);
      return interaction.editReply({ content: 'Application canceled.' });
    }

    responses.push(answer);
  }

  const { applicationLogId } = await getInfoConfig();
  const logChannel = await interaction.client.channels.fetch(applicationLogId);
  const fields = questions.map((q, idx) => ({ name: q, value: `🔸 ${responses[idx]}` }));

  const guild = interaction.guild;

  // fetch the member so we can read their nickname
  const member = await guild.members.fetch(user.id);

  await logChannel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`New Application: ${APP_TYPE_DISPLAY[option]}`)
        //.setAuthor({ name: member.displayName, iconURL: user.displayAvatarURL() })
        .setDescription(`👤 <@${member.id}> (${member.displayName})`)
        .setThumbnail(member.displayAvatarURL({ dynamic: true }))
        .addFields(fields)
        .setColor(0xb8773b)
        .setTimestamp()
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`app_accept_${user.id}_${option}`)
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`app_deny_${user.id}_${option}`)
          .setLabel('Deny')
          .setStyle(ButtonStyle.Danger)
      )
    ]
  });

  await dm.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Application Submitted')
        .setDescription('Thanks! Your application is under review.')
        .setColor(0x2ecc71)
        .setTimestamp()
    ]
  });

  inProgress.delete(interaction.user.id);
  await interaction.message.edit({ components: [buildDropdown()] });
  return interaction.editReply({ content: 'Check your DMs to complete the application.' });
}

module.exports = { handleApplicationDropdown };
