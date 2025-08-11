const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('node:fs').promises;
const path = require('node:path');

const LEARN_ID_FILE = path.join(__dirname, 'persistentLearnerId.json');

async function learnerInteractions(interaction) {

  if (!interaction.guild || !interaction.member) return;

  if (interaction.customId === 'cox_learnerBtn') {
    const role = interaction.guild.roles.cache.get('1337486168228630578');
    if (!role) {
      await interaction.reply({ content: 'Tox role not found!', ephemeral: true });
      return;
    }
    await interaction.member.roles.add(role);
    await interaction.reply({ content: 'You will now receive pings for CoX mentor raids!', ephemeral: true });
    return;
  }

  if (interaction.customId === 'tob_learnerBtn') {
    const role = interaction.guild.roles.cache.get('1337486119134167122');
    if (!role) {
      await interaction.reply({ content: 'Tob role not found!', ephemeral: true });
      return;
    }
    await interaction.member.roles.add(role);
    await interaction.reply({ content: 'You will now receive pings for ToB mentor raids!', ephemeral: true });
    return;
  }

  if (interaction.customId === 'toa_learnerBtn') {
    const role = interaction.guild.roles.cache.get('1337486739840700489');
    if (!role) {
      await interaction.reply({ content: 'ToA role not found!', ephemeral: true });
      return;
    }
    await interaction.member.roles.add(role);
    await interaction.reply({ content: 'You will now receive pings for ToA mentor raids!', ephemeral: true });
    return;
  }

  if (interaction.customId === 'pvp_learnerBtn') {
    const role = interaction.guild.roles.cache.get('1337488782848430171');
    if (!role) {
      await interaction.reply({ content: 'PVP role not found!', ephemeral: true });
      return;
    }
    await interaction.member.roles.add(role);
    await interaction.reply({ content: 'You will now receive pings for PvP mentor sessions!', ephemeral: true });
    return;
  }
}

async function loadLearnerMessageId() {
  try {
    const data = await fs.readFile(LEARN_ID_FILE, 'utf8');
    return JSON.parse(data).id;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error reading learner ID file:', err);
    }
    return null;
  }
}

// Async version to save the message ID
async function saveLearnerId(messageId) {
  try {
    await fs.writeFile(LEARN_ID_FILE, JSON.stringify({ id: messageId }), 'utf8');
  } catch (err) {
    console.error('Error writing learner ID file:', err);
  }
}

async function sendOrUpdateLearnerButton(channel, guild) {
  const existingMessageId = await loadLearnerMessageId();

  try {
    if (existingMessageId) {
      const existingMessage = await channel.messages.fetch(existingMessageId).catch(() => null);

      if (existingMessage) {

        const button = new ButtonBuilder()
          .setCustomId('tob_learnerBtn')
          .setLabel('ToB Learner Pings!')
          .setStyle(ButtonStyle.Primary);

        const button2 = new ButtonBuilder()
          .setCustomId('cox_learnerBtn')
          .setLabel('CoX Learner Pings!')
          .setStyle(ButtonStyle.Success);

        const button3 = new ButtonBuilder()
          .setCustomId('toa_learnerBtn')
          .setLabel('ToA Learner Pings!')
          .setStyle(ButtonStyle.Danger);

        const button4 = new ButtonBuilder()
          .setCustomId('pvp_learnerBtn')
          .setLabel('PvP Learner Pings!')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(button, button2, button3, button4);

        //adding embed above button
        const embed = new EmbedBuilder()
          .setTitle('Pings for Mentor Raids')
          .setDescription('Click one of the buttons below to receive pings when a mentor is running!')
          // .addFields(
          // { name:'ToB Learner ', value:`INFO`},
          // { name: 'ToA Learner: ', value: `INFO` },
          // { name: 'CoX Learner: ', value: `INFO` })
          .setThumbnail(guild.iconURL({ dynamic: true, size: 2048 }))
          .setColor(0x3498db)

        await existingMessage.edit({
          embeds: [embed],
          components: [row],
        });

        console.log('Persistent button updated on existing message.');
        return;
      }
    }

    const button = new ButtonBuilder()
      .setCustomId('tob_learnerBtn')
      .setLabel('ToB Learner Pings!')
      .setStyle(ButtonStyle.Primary);

    const button2 = new ButtonBuilder()
      .setCustomId('cox_learnerBtn')
      .setLabel('CoX Learner Pings!')
      .setStyle(ButtonStyle.Success);

    const button3 = new ButtonBuilder()
      .setCustomId('toa_learnerBtn')
      .setLabel('ToA Learner Pings!')
      .setStyle(ButtonStyle.Danger);

    const button4 = new ButtonBuilder()
      .setCustomId('pvp_learnerBtn')
      .setLabel('PvP Learner Pings!')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(button, button2, button3, button4);

    //adding embed above button
    const embed = new EmbedBuilder()
      .setTitle('Pings for Mentor Raids')
      .setDescription('Click one of the buttons below to receive pings when a mentor is running!')
      // .addFields(
      // { name:'ToB Learner ', value:`INFO`},
      // { name: 'ToA Learner: ', value: `INFO` },
      // { name: 'CoX Learner: ', value: `INFO` })
      .setThumbnail(guild.iconURL({ dynamic: true, size: 2048 }))
      .setColor(0x3498db) // Color: Blue 

    const newMessage = await channel.send({
      embeds: [embed],
      components: [row],
    });

    await saveLearnerId(newMessage.id);
    console.log('New persistent button message created.');
  } catch (error) {
    console.error('Error managing persistent button message:', error);
  }
}

module.exports = { learnerInteractions, loadLearnerMessageId, saveLearnerId, sendOrUpdateLearnerButton };

