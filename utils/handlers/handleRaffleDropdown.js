const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getInfoConfig } = require('./configHelper.js');

//const TICKET_LIMIT = 100;
const MAX_TICKETS_PER_USER = 5;
const LOG_CHANNEL_ID = '1370106004410470544';
const raffleDataPath = path.join(__dirname, '../../data/raffleEntries.json');
const potluckDataPath = path.join(__dirname, '../../data/potluckEntries.json');
const configPath = path.join(__dirname, '../../data/raffleConfig.json');

if (!fs.existsSync(potluckDataPath)) fs.writeFileSync(potluckDataPath, JSON.stringify({}));
if (!fs.existsSync(raffleDataPath)) fs.writeFileSync(raffleDataPath, JSON.stringify({}));

function buildRaffleDropdown() {
  // const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

  const resetMenu = new StringSelectMenuBuilder()
    .setCustomId('raffle_dropdown')
    .setPlaceholder('Choose an option...')
    .addOptions([
      {
        label: 'Enter Raffle',
        value: 'raffle_application',
      },
      {
        label: 'Enter PotLuck',
        value: 'potluck_application',
      }
    ]);

  return new ActionRowBuilder().addComponents(resetMenu);
}

async function collectImages(dmChannel, user, promptText, imageURL = null) {
  const instructionEmbed = new EmbedBuilder()
    .setTitle('📸 Upload Verification Image(s)')
    .setDescription(promptText + '\n\nYou may send multiple images.\nType `done` when you’re finished, or `cancel` to abort.')
    .setColor(0x5865f2);

  if (imageURL) {
    instructionEmbed.setImage(imageURL);
  }

  await dmChannel.send({ embeds: [instructionEmbed] });

  const attachments = [];

  const collector = dmChannel.createMessageCollector({
    filter: m => m.author.id === user.id,
    time: 5 * 60 * 1000,
  });

  return new Promise((resolve, reject) => {
    collector.on('collect', message => {
      const content = message.content.toLowerCase();

      if (content === 'cancel') {
        collector.stop('cancel');
        return;
      }

      if (content === 'done') {
        if (attachments.length < 1) {
          dmChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('❌ At Least One Image Required')
                .setDescription('Please upload at least one image before typing `done`.')
                .setColor(0xe74c3c)
            ]
          });
          return;
        }

        collector.stop('done');
        return;
      }

      if (message.attachments.size > 0) {
        message.attachments.forEach(att => {
          if (att.contentType?.startsWith('image/')) {
            attachments.push(att);
          }
        });
      }
    });

    //   collector.on('end', (_, reason) => {
    //     if (reason === 'cancel') return reject('cancel');
    //     resolve(attachments);
    //   });
    collector.on('end', (_, reason) => {
      if (reason === 'cancel') return reject('cancel');
      if (attachments.length === 0) return reject('timeout');
      resolve(attachments);
    });

  });
}




async function handleRaffleDropdown(interaction) {
  const user = interaction.user;
  const member = interaction.guild.members.cache.get(user.id);
  const selected = interaction.values[0];
  const { applicationLogId } = await getInfoConfig()

  let raffleClosed = false;
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      raffleClosed = !!cfg.raffleClosed;
    } catch {
      // ignore parse errors, keep default
    }
  }

  try {
    await interaction.reply({ content: 'Check your DMs!', ephemeral: true });

    const dmChannel = await user.createDM();
    const sendEmbedPrompt = async (title, question) => {
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(question + '\n\nType `cancel` at any time to exit.')
        .setColor(0x5865f2);
      return await dmChannel.send({ embeds: [embed] });
    };

    const ask = async (title, question) => {
      await sendEmbedPrompt(title, question);
      const collected = await dmChannel.awaitMessages({
        filter: m => m.author.id === user.id,
        max: 1,
        time: 60000,
        errors: ['time']
      });
      const response = collected.first().content.trim();
      if (response.toLowerCase() === 'cancel') throw 'cancel';
      return response;
    };

    const data = JSON.parse(fs.readFileSync(raffleDataPath));
    const totalTickets = Object.values(data).reduce((sum, v) => sum + (v.tickets || 0), 0);
    //const remaining = TICKET_LIMIT - totalTickets;

    const previousTickets = data[user.id]?.tickets || 0;
    const personalRemaining = MAX_TICKETS_PER_USER - previousTickets;

    if (personalRemaining <= 0) {
      return await dmChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Ticket Limit Reached')
            .setDescription(`You’ve already claimed your maximum of **${MAX_TICKETS_PER_USER}** tickets.`)
            .setColor(0xe74c3c)
        ]
      });
    }


    if (selected === 'raffle_application') {
      // if (remaining <= 0) {
      //   return await dmChannel.send({
      //     embeds: [
      //       new EmbedBuilder()
      //         .setTitle('Raffle Full')
      //         .setDescription('Sorry, all tickets have been claimed.')
      //         .setColor(0xe74c3c)
      //     ]
      //   });
      // }

      if (raffleClosed === true) {
        const defaultRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('raffle_dropdown')
            .setPlaceholder('Select an option...')
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
            ])
        );

        try {
          await interaction.message.edit({ components: [defaultRow] });
        } catch (err) {
          console.error('Failed to reset dropdown after cancel:', err);
        }

        return await dmChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ Cannot Enter')
              .setDescription('The raffle is currently closed.')
              .setColor(0xe74c3c)
          ]
        });
      }

      //const maxAllowed = Math.min(personalRemaining, remaining);
      const maxAllowed = personalRemaining;


      // const prompt = `A total of **${totalTickets}** tickets have been claimed.\n` +
      //   `There are **${remaining}** tickets remaining.\n` +
      //   `How many would you like to claim? (Max **${maxAllowed}**)`;

      const prompt = `How many raffle tickets would you like to claim? (Max **${maxAllowed}**)`;

      let ticketCount;
      while (true) {
        const input = await ask('🎟️ Raffle Entry', prompt);
        ticketCount = parseInt(input, 10);

        if (isNaN(ticketCount) || ticketCount < 1) {
          await dmChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('❌ Invalid Entry')
                .setDescription(`You must enter a number between 1 and ${maxAllowed}.`)
                .setColor(0xe74c3c)
            ]
          });
          continue;
        }

        // if (ticketCount > personalRemaining) {
        //     await dmChannel.send({
        //     embeds: [
        //         new EmbedBuilder()
        //         .setTitle('❌ Too Many Tickets')
        //         .setDescription(`You’ve already claimed **${previousTickets}**.\nYou can only request up to **${personalRemaining}** more.`)
        //         .setColor(0xe74c3c)
        //     ]
        //     });
        //     continue;
        // }

        // if (ticketCount > remaining) {
        //     await dmChannel.send({
        //     embeds: [
        //         new EmbedBuilder()
        //         .setTitle('❌ Not Enough Tickets Remaining')
        //         .setDescription(`Only **${remaining}** tickets are available.\nYou may request up to **${maxAllowed}**.`)
        //         .setColor(0xe74c3c)
        //     ]
        //     });
        //     continue;
        // }
        if (ticketCount > maxAllowed) {
          await dmChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('❌ Ticket Limit Exceeded')
                .setDescription(
                  `You’ve requested **${ticketCount}** ticket(s), but only **${maxAllowed}** are available to you.\n` +
                  `• You already claimed: **${previousTickets}**\n` +
                  `• You can still claim: **${personalRemaining}**\n` +
                  `• Tickets left globally: **${remaining}**`
                )
                .setColor(0xe74c3c)
            ]
          });
          continue;
        }


        break;
      }


      //const attachments = await collectImages(dmChannel, user);
      const attachments = await collectImages(dmChannel, user,
        'Please upload at least one image **showing your clan coffer deposit** for verification.\n\n**Cost:** 1M gp per ticket',
        'https://i.imgur.com/UNkgVW6.png');


      //saving only if images have been collected. 
      data[user.id] = { tickets: previousTickets + ticketCount };
      fs.writeFileSync(raffleDataPath, JSON.stringify(data, null, 2));

      const raffleEmbed = new EmbedBuilder()
        .setTitle('🎟️ Raffle Entry')
        .setDescription(`${member} (${member.displayName}) entered the raffle with **${ticketCount}** ticket(s).`)
        .setThumbnail(member.displayAvatarURL({ dynamic: true }))
        .setColor(0x3498db)
        .setTimestamp();

      if (attachments.length > 0) {
        raffleEmbed.setImage(attachments[0].url);
        if (attachments.length > 1) {
          raffleEmbed.addFields({
            name: 'More Images',
            value: attachments.slice(1).map((a, i) => `[Image ${i + 2}](${a.url})`).join('\n')
          });
        }
      }

      const logChannel = interaction.guild.channels.cache.get(applicationLogId);
      if (logChannel) {
        await logChannel.send({ embeds: [raffleEmbed] });
      }




      await dmChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ Entry Received')
            .setDescription(`You've been entered into the raffle with **${ticketCount}** ticket(s)!`)
            .setColor(0x2ecc71)
        ]
      });

    } else if (selected === 'potluck_application') {
      const donation = await ask('PotLuck Entry', 'What are you donating for the potluck?\nPlease list any items and/or GP on a single line, separated by commas (ex. dragon pickaxe, tbow, 2B gp)');


      // data[user.id] = { potluck: donation };
      const potluckData = JSON.parse(fs.readFileSync(potluckDataPath));
      // potluckData[user.id] = {
      //   displayName: member.displayName,
      //   donation: donation
      // };

      const existingDonation = potluckData[user.id]?.donation || '';
      const combinedDonation = existingDonation
        ? existingDonation + ', ' + donation
        : donation;

      potluckData[user.id] = {
        displayName: member.displayName,
        donation: combinedDonation
      };

      //const attachments = await collectImages(dmChannel, user);
      const attachments = await collectImages(dmChannel, user,
        'Please upload at least one image **showing the items or gp you wish to donate**.');

      data[user.id] = { potluck: donation };
      fs.writeFileSync(potluckDataPath, JSON.stringify(potluckData, null, 2));



      const donationItems = donation.split(',').map(item => `• ${item.trim()}`).join('\n');
      const potluckEmbed = new EmbedBuilder()
        .setTitle('💰PotLuck Entry')
        .setDescription(`${member} (${member.displayName}) is donating:\n\n${donationItems}`)
        .setThumbnail(member.displayAvatarURL({ dynamic: true }))
        .setColor(0x27ae60)
        .setTimestamp();

      if (attachments.length > 0) {
        potluckEmbed.setImage(attachments[0].url);
        if (attachments.length > 1) {
          potluckEmbed.addFields({
            name: 'More Images',
            value: attachments.slice(1).map((a, i) => `[Image ${i + 2}](${a.url})`).join('\n')
          });
        }
      }

      const logChannel = interaction.guild.channels.cache.get(applicationLogId);
      if (logChannel) {
        await logChannel.send({ embeds: [potluckEmbed] });
      }

      await dmChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ Donation Confirmed')
            .setDescription(`Thanks! You've signed up to bring: **${donation}**`)
            .setColor(0x2ecc71)
        ]
      });
    }
    const originalMessage = await interaction.channel.messages.fetch(interaction.message.id);
    const originalEmbed = originalMessage.embeds[0];
    const row = buildRaffleDropdown();

    await originalMessage.edit({
      embeds: [originalEmbed],
      components: [row]
    });


  } catch (err) {
    if (err === 'cancel') {
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Cancelled')
            .setDescription('Your application has been cancelled.')
            .setColor(0xe67e22)
        ]
      });

      const defaultRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('raffle_dropdown')
          .setPlaceholder('Select an option...')
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
          ])
      );

      try {
        await interaction.message.edit({ components: [defaultRow] });
      } catch (err) {
        console.error('Failed to reset dropdown after cancel:', err);
      }

    } else if (err === 'timeout') {
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('⚠️ Timeout')
            .setDescription('Your application timed out waiting for image uploads. Please try again.')
            .setColor(0xe74c3c)
        ]
      });

      const defaultRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('raffle_dropdown')
          .setPlaceholder('Select an option...')
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
          ])
      );

      try {
        await interaction.message.edit({ components: [defaultRow] });
      } catch (err) {
        console.error('Failed to reset dropdown after timeout:', err);
      }
    }
  }

}

module.exports = { handleRaffleDropdown };
