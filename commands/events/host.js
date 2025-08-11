const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const { MAINTENANCE_MODE } = process.env;


const eventsPath = path.join(__dirname, '../../data/events.json');
const embedPath = path.join(__dirname, '../../data/eventEmbed.json');


async function loadEvents() {
  try {
    const data = await fs.readFile(eventsPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveEvents(events) {
  await fs.writeFile(eventsPath, JSON.stringify(events, null, 2));
}

async function askQuestion(dmChannel, questionText) {
  const embed = new EmbedBuilder()
    .setDescription(questionText)
    .setFooter({ text: 'Type "cancel" to cancel this interaction.' })
    .setTimestamp();
  await dmChannel.send({ embeds: [embed] });

  const filter = m => m.author.id === dmChannel.recipient.id;
  try {
    const collected = await dmChannel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] });
    const response = collected.first();
    if (response.content.toLowerCase() === 'cancel') throw 'cancel';
    return response.content;
  } catch {
    throw 'cancel';
  }
}

function buildEventsEmbed(guild, events) {
  const embed = new EmbedBuilder()
    .setTitle('Clan Event Coordination')
    .setAuthor({ name: 'AFK Stacks' })
    .setColor(0x202E95)
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setFooter({ text: 'Last updated' })
    .setTimestamp();


  events.forEach(event => {
    embed.addFields({
      name: event.name,
      value: `Date: 🗓️ ${event.date}\nHost: ${event.host}`,
      inline: false
    });
  });

  return embed;
}

async function updatePublishedEmbed(client, guild) {
  try {
    const data = await fs.readFile(embedPath, 'utf8');
    const { messageId, channelId } = JSON.parse(data);
    const channel = await client.channels.fetch(channelId);
    if (!channel) throw new Error('Channel not found');
    const message = await channel.messages.fetch(messageId);
    if (!message) throw new Error('Message not found');

    const events = await loadEvents();
    const updatedEmbed = buildEventsEmbed(guild, events);
    await message.edit({ embeds: [updatedEmbed] });
  } catch (error) {
    console.error('Error updating published embed:', error);
  }
}


async function publishEventEmbed(channel, client, guild) {
  const events = await loadEvents();
  const embed = buildEventsEmbed(guild, events);
  const message = await channel.send({ embeds: [embed] });

  const data = { messageId: message.id, channelId: channel.id };
  await fs.writeFile(embedPath, JSON.stringify(data, null, 2));
  return message;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eventsembed')
    .setDescription('Create, edit events via DM, or publish the event embed to a channel.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new event')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit or delete an existing event')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('channel')
        .setDescription('Publish (or republish) the event embed to a channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to publish the embed in')
            .setRequired(true)
        )
    ),

  async execute(interaction) {

    if (true) {
      const gifEmbed = new EmbedBuilder()
        .setTitle('Bot is under maintenance!')
        .setDescription('Try again later, or enjoy this masterpiece meanwhile:')
        .setImage('https://media.giphy.com/media/3o6ozlKdWlbxGthEiY/giphy.gif')
        .setColor(0xffcc00);

      await interaction.reply({ embeds: [gifEmbed], ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();


    if (subcommand === 'channel') {
      const channel = interaction.options.getChannel('channel');


      if (!channel.permissionsFor(interaction.client.user).has(PermissionsBitField.Flags.SendMessages)) {
        return interaction.reply({ content: 'I don’t have permission to send messages in that channel!', ephemeral: true });
      }


      const embed = new EmbedBuilder()
        .setTitle('Clan Event Coordination')
        .setAuthor({ name: 'AFK Stacks' })
        .setColor(0x202E95)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({ text: 'Last updated' })
        .setTimestamp();


      const sentMessage = await channel.send({ embeds: [embed] });


      const newData = { messageId: sentMessage.id, channelId: channel.id };
      await fs.writeFile(embedPath, JSON.stringify(newData, null, 2));


      return interaction.reply({ content: `Embed published in ${channel}`, ephemeral: true });
    }


    await interaction.reply({ content: 'I\'ve sent you a DM!', ephemeral: true });

    let dmChannel;
    try {
      dmChannel = await interaction.user.createDM();
    } catch (error) {
      return interaction.followUp({ content: 'Could not open a DM with you.', ephemeral: true });
    }


    function findMember(hostInput) {
      return interaction.guild.members.cache.find(m => {
        const nickname = m.nickname ? m.nickname.toLowerCase() : null;
        return (nickname && nickname === hostInput.toLowerCase()) ||
          m.user.username.toLowerCase() === hostInput.toLowerCase();
      });
    }


    if (subcommand === 'create') {
      try {
        const name = await askQuestion(dmChannel, '**What is the name of the event?** (e.g. Hide and Seek)');
        const dateInput = await askQuestion(dmChannel, 'Please provide the **date** of the event 🗓️ (various formats accepted)');
        const hostResponse = await askQuestion(dmChannel, 'Is there a host for the event? (Type "yes" or "no")');
        let host = '';
        if (hostResponse.toLowerCase() === 'yes') {
          const hostInput = await askQuestion(dmChannel, 'Please enter the host\'s nickname (or username if no nickname):');
          const member = findMember(hostInput);
          if (member) {
            host = `☑️ ${member}(${hostInput})`;
          } else {
            host = `☑️ ${hostInput}`;
          }
        } else {
          host = '❌';
        }

        const newEvent = { name, date: dateInput, host };
        const events = await loadEvents();
        events.push(newEvent);
        await saveEvents(events);

        await dmChannel.send({
          embeds: [new EmbedBuilder()
            .setDescription(`✅ Event **${name}** created successfully!`)
            .setTimestamp()
          ]
        });
      } catch (err) {
        if (err === 'cancel') return dmChannel.send({ content: 'Interaction cancelled.' });
        console.error(err);
        return dmChannel.send({ content: 'An error occurred during the creation process.' });
      }
    }


    if (subcommand === 'edit') {
      try {
        const action = await askQuestion(dmChannel, 'Do you want to **edit** or **delete** an event? (Type "edit" or "delete")');
        const events = await loadEvents();

        if (action.toLowerCase() === 'delete') {
          const eventName = await askQuestion(dmChannel, 'Enter the name of the event to delete:');
          const index = events.findIndex(e => e.name.toLowerCase() === eventName.toLowerCase());
          if (index === -1) {
            return dmChannel.send({ content: `❌ Event "${eventName}" not found.` });
          }
          events.splice(index, 1);
          await saveEvents(events);
          await dmChannel.send({ content: `✅ Event "${eventName}" has been deleted.` });
        } else if (action.toLowerCase() === 'edit') {
          const eventName = await askQuestion(dmChannel, 'Enter the name of the event to edit:');
          const event = events.find(e => e.name.toLowerCase() === eventName.toLowerCase());
          if (!event) {
            return dmChannel.send({ content: `❌ Event "${eventName}" not found.` });
          }
          await dmChannel.send({ content: 'Type **1** to edit the event name, **2** to edit the date, **3** to edit the host. Type "done" when finished.' });

          let editing = true;
          while (editing) {
            const choice = await askQuestion(dmChannel, 'What would you like to edit? (1 for name, 2 for date, 3 for host, or type "done")');
            if (choice.toLowerCase() === 'done') {
              editing = false;
              break;
            }
            if (choice === '1') {
              const newName = await askQuestion(dmChannel, 'Enter the new event name:');
              event.name = newName;
              await dmChannel.send({ content: `✅ Event name updated to **${newName}**.` });
            } else if (choice === '2') {
              const newDate = await askQuestion(dmChannel, 'Enter the new date for the event (🗓️ will be added in the embed):');
              event.date = newDate;
              await dmChannel.send({ content: `✅ Event date updated to **${newDate}**.` });
            } else if (choice === '3') {
              const hostAnswer = await askQuestion(dmChannel, 'Is there a host? (Type "yes" or "no")');
              if (hostAnswer.toLowerCase() === 'yes') {
                const hostInput = await askQuestion(dmChannel, 'Enter the host\'s nickname (or username if no nickname):');
                const member = findMember(hostInput);
                if (member) {
                  event.host = `☑️ ${member}(${hostInput})`;
                } else {
                  event.host = `☑️ ${hostInput}`;
                }
                await dmChannel.send({ content: `✅ Host updated to ${event.host}.` });
              } else {
                event.host = '❌';
                await dmChannel.send({ content: `✅ Host cleared.` });
              }
            } else {
              await dmChannel.send({ content: 'Invalid option. Please choose 1, 2, 3, or type "done".' });
            }
          }
          await saveEvents(events);
          await dmChannel.send({ content: '✅ Your updates have been made.' });
        } else {
          return dmChannel.send({ content: 'Invalid action. Please try again.' });
        }
      } catch (err) {
        if (err === 'cancel') return dmChannel.send({ content: 'Interaction cancelled.' });
        console.error(err);
        return dmChannel.send({ content: 'An error occurred during the edit process.' });
      }
    }

    await updatePublishedEmbed(interaction.client, interaction.guild);
    await dmChannel.send({ content: 'The event embed has been refreshed with the latest updates.' });
  }
};
