const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const { createCofferEmbed } = require('../../utils/handlers/cofferEmbed.js');
const { getInfoConfig } = require('../../utils/handlers/configHelper.js')
require('dotenv').config();
const { MAINTENANCE_MODE } = process.env;

const dataPath = path.join(__dirname, '../../data/coffer.json');
const MAX_COFFER = 50000000;

function parseAmount(input) {
  if (!input) return 0;
  input = input.replace(/,/g, '').toLowerCase().trim();
  const regex = /^([\d.]+)\s*([kmb])?$/;
  const match = input.match(regex);
  if (!match) return 0;
  let number = parseFloat(match[1]);
  const multiplier = match[2];
  if (multiplier === 'k') number *= 1e3;
  else if (multiplier === 'm') number *= 1e6;
  else if (multiplier === 'b') number *= 1e9;
  return Math.floor(number);
}

function getOverflowTotal(holders) {
  return Object.values(holders).reduce((sum, v) => sum + v, 0);
}

async function readData() {
  try {
    await fsPromises.access(dataPath);
  } catch {
    return { coffer: 0, overflowHolders: {}, publishedEmbed: {} };
  }
  const file = await fsPromises.readFile(dataPath, 'utf8');
  let data;
  try { data = JSON.parse(file); } catch { data = {}; }
  return {
    coffer: typeof data.coffer === 'number' ? data.coffer : 0,
    overflowHolders: typeof data.overflowHolders === 'object' && data.overflowHolders ? data.overflowHolders : {},
    publishedEmbed: data.publishedEmbed || {},
    shortFormat: typeof data.shortFormat === 'boolean' ? data.shortFormat : false
  };
}

async function writeData(data) {
  await fsPromises.writeFile(dataPath, JSON.stringify(data, null, 2));
}

async function updatePublishedEmbed(data, interaction) {
  const { channelId, messageId } = data.publishedEmbed || {};

  if (!channelId || !messageId) {
    console.warn('[coffer] no publishedEmbed set in coffer.json, skipping update.');
    return;
  }

  let channel, message;
  try {
    channel = await interaction.client.channels.fetch(channelId);
    if (!channel?.isTextBased()) throw new Error('Not a text channel');
    message = await channel.messages.fetch(messageId);
    if (!message) throw new Error('Message not found');
  } catch (err) {
    console.error('[coffer] couldn\'t fetch published embed:', err);
    return;
  }

  const totalOverflow = getOverflowTotal(data.overflowHolders);
  const { embed, row } = createCofferEmbed(
    data.coffer,
    totalOverflow,
    data.overflowHolders,
    interaction.guild,
    data.shortFormat
  );

  try {
    await message.edit({ embeds: [embed], components: [row] });
    console.log('[coffer] successfully updated published embed');
  } catch (err) {
    console.error('[coffer] failed to edit published embed:', err);
  }
}


module.exports = {
  data: new SlashCommandBuilder()
    .setName('coffer')
    .setDescription("Manage your OSRS clan's coffer")
    .addSubcommand(cmd =>
      cmd.setName('setvalue')
        .setDescription('Set the absolute value for coffer or your overflow.')
        .addStringOption(opt => opt
          .setName('target')
          .setDescription('Which value to set: coffer or overflow')
          .setRequired(true)
          .addChoices(
            { name: 'coffer', value: 'coffer' },
            { name: 'overflow', value: 'overflow' }
          ))
        .addStringOption(opt => opt
          .setName('amount')
          .setDescription('Value to set (e.g., "1m" or "500k")')
          .setRequired(true))
        .addUserOption(opt => opt
          .setName('holder')
          .setDescription('Which member\'s overflow to set')
          .setRequired(false))
    )
    .addSubcommand(cmd =>
      cmd.setName('clanhall')
        .setDescription('Deposit to or withdraw from the clan hall coffer.')
        .addStringOption(opt => opt
          .setName('action')
          .setDescription('Deposit or withdraw')
          .setRequired(true)
          .addChoices(
            { name: 'deposit', value: 'deposit' },
            { name: 'withdraw', value: 'withdraw' }
          ))
        .addStringOption(opt => opt
          .setName('amount')
          .setDescription('Amount to adjust (e.g., "1m" or "500k")')
          .setRequired(true))
        .addUserOption(opt => opt
          .setName('attribution')
          .setDescription('Guild member to attribute this transaction'))
    )
    .addSubcommand(cmd =>
      cmd.setName('overflow')
        .setDescription('Deposit to or withdraw from your personal overflow.')
        .addStringOption(opt => opt
          .setName('action')
          .setDescription('Deposit or withdraw')
          .setRequired(true)
          .addChoices(
            { name: 'deposit', value: 'deposit' },
            { name: 'withdraw', value: 'withdraw' }
          ))
        .addStringOption(opt => opt
          .setName('amount')
          .setDescription('Amount to adjust (e.g., "1m" or "500k")')
          .setRequired(true))
    )
    .addSubcommand(cmd =>
      cmd.setName('balance')
        .setDescription('Show current coffer and overflow balances.')
    )
    .addSubcommand(cmd =>
      cmd.setName('publish')
        .setDescription('Publish the current balances in an embed to a channel.')
        .addChannelOption(opt => opt
          .setName('channel')
          .setDescription('Channel to publish the balance embed')
          .setRequired(true))
    )
    .addSubcommand(cmd =>
      cmd.setName('transfer')
        .setDescription('Transfer coffer funds into your overflow.')
        .addStringOption(opt => opt
          .setName('amount')
          .setDescription('Amount to transfer (e.g., "1m" or "500k")')
          .setRequired(true))
    )
    .addSubcommand(cmd =>
      cmd
        .setName('overflow-transfer')
        .setDescription('Send some of your overflow to another member')
        .addUserOption(opt =>
          opt
            .setName('target')
            .setDescription('Who to send your overflow to')
            .setRequired(true))
        .addStringOption(opt =>
          opt
            .setName('amount')
            .setDescription('Amount to transfer (e.g. "500k")')
            .setRequired(true))
    )
    .addSubcommand(cmd =>
      cmd
        .setName('sweep')
        .setDescription('Consolidate the overflow into one account.')
        .addUserOption(opt =>
          opt
            .setName('holder')
            .setDescription(`(Optional) Sweep only this member's overflow`)
            .setRequired(false)
        )
    )

  ,


  async execute(interaction) {

    if (MAINTENANCE_MODE === 'true') {
      const gif = new EmbedBuilder()
        .setTitle('Under Maintenance')
        .setDescription('Back soon!')
        .setColor('Yellow');
      return interaction.reply({ embeds: [gif], ephemeral: true });
    }

    const { transactionLogId } = await getInfoConfig();
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const mention = interaction.user.toString();
    const data = await readData();
    const overflowTotal = getOverflowTotal(data.overflowHolders);

    if (sub !== 'publish') {
      if (!transactionLogId || interaction.channel.id !== transactionLogId) {
        const embed = new EmbedBuilder()
          .setColor('Red')
          .setDescription(`❌ Please use this command in <#${transactionLogId || 'your-logs-channel'}>.`);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }
    }

    switch (sub) {
      case 'setvalue': {
        const target = interaction.options.getString('target');
        const amt = parseAmount(interaction.options.getString('amount'));
        if (target === 'coffer') { data.coffer = Math.min(amt, MAX_COFFER); }
        else {

          const holderUser = interaction.options.getUser('holder');
          if (!holderUser) {
            return interaction.reply({ content: '<:Engaged_in_suspected_spam_activ:1395170301498626058> Please specify a member to set overflow for.', flags: MessageFlags.Ephemeral });
          }
          data.overflowHolders[holderUser.id] = amt;
          /**
           * if (amt === 0) {
delete data.overflowHolders[holderId];
}

           */
        }

        await writeData(data);
        await updatePublishedEmbed(data, interaction);

        const newTotalOverflow = getOverflowTotal(data.overflowHolders);
        const reply = new EmbedBuilder()
          .setTitle('<:Auditlog_mobile:1394059294365978704> Value Updated')
          .setDescription(
            target === 'coffer'
              ? `${mention} set the coffer to ${amt.toLocaleString()}.`
              : `${interaction.options.getUser('holder')}'s overflow set to ${amt.toLocaleString()}.`
          )
          // .setFooter({ text: `New total overflow: ${newTotalOverflow.toLocaleString()}` });
          .setFooter({ text: `Total Clan Funds: ${(data.coffer + newTotalOverflow).toLocaleString()}` });

        return interaction.reply({ embeds: [reply] });
        //data.overflowHolders[userId] = amt;
        //await writeData(data);
        //await updatePublishedEmbed(data, interaction);
        //const newTotal = getOverflowTotal(data.overflowHolders);
        //const reply = new EmbedBuilder()
        //   .setTitle('<:Auditlog_mobile:1394059294365978704> Bank Balance Updated')
        //   .setDescription(
        //      target === 'coffer'
        //         ? `${mention} set the coffer to ${amt.toLocaleString()}.`
        //         : `${mention} set their overflow to ${amt.toLocaleString()}.`
        //   )
        //   .setFooter({ text: `New total balance: ${(amt + newTotal).toLocaleString()}` });
        //return interaction.reply({ embeds: [reply] });
      }

      case 'clanhall': {
        const action = interaction.options.getString('action');
        const amt = parseAmount(interaction.options.getString('amount'));
        const attr = interaction.options.getUser('attribution')?.toString() || mention;
        if (action === 'deposit') {
          const space = MAX_COFFER - data.coffer;
          if (amt <= space) data.coffer += amt;
          else {
            data.coffer = MAX_COFFER;
            data.overflowHolders[userId] = (data.overflowHolders[userId] || 0) + (amt - space);
          }
        } else {
          if (amt > data.coffer) {
            return interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setTitle('Insufficient Funds')
                  .setDescription(`Not enough in the coffer.`)
              ], ephemeral: true
            });
          }
          data.coffer -= amt;
        }
        await writeData(data);
        await updatePublishedEmbed(data, interaction);
        const totalOverflow = getOverflowTotal(data.overflowHolders);
        const resp = new EmbedBuilder()
          .setTitle(`<:Discord_category_collapsed_white:1394059288619782226> ${action === 'deposit' ? 'Deposit Completed' : 'Withdrawal Completed'}`)
          .setColor(action === 'deposit' ? 0x27ae60 : 0xe74c3c)
          .setDescription(
            `${attr} ${action === 'deposit' ? 'deposited' : 'withdrew'} ${amt.toLocaleString()}. ` +
            `Coffer: ${data.coffer.toLocaleString()}, Overflow: ${totalOverflow.toLocaleString()}.`
          )
          .setFooter({ text: `Total Clan Funds: ${(data.coffer + totalOverflow).toLocaleString()}` });
        return interaction.reply({ embeds: [resp] });
      }

      case 'overflow': {
        const action = interaction.options.getString('action');
        const amt = parseAmount(interaction.options.getString('amount'));
        const have = data.overflowHolders[userId] || 0;
        if (action === 'deposit') data.overflowHolders[userId] = have + amt;
        else {
          if (amt > have) {
            return interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setTitle('Insufficient Overflow')
                  .setDescription(`You only have ${have.toLocaleString()} overflow.`)
              ], ephemeral: true
            });
          }
          data.overflowHolders[userId] = have - amt;
          /**
           * if (amt === 0) {
delete data.overflowHolders[holderId];
}

           */
        }
        await writeData(data);
        await updatePublishedEmbed(data, interaction);
        const nowHave = data.overflowHolders[userId];
        const tot = getOverflowTotal(data.overflowHolders);
        const out = new EmbedBuilder()
          .setTitle(`<:Discord_category_collapsed_white:1394059288619782226> ${action === 'deposit' ? 'Overflow Added' : 'Overflow Removed'}`)
          .setColor(action === 'deposit' ? 0x27ae60 : 0xe74c3c)
          .setDescription(
            `${mention} ${action === 'deposit' ? 'added' : 'withdrew'} ${amt.toLocaleString()} overflow. ` +
            `You now have ${nowHave.toLocaleString()}.`
          ).setFooter({ text: `Total Clan Funds: ${data.coffer + tot.toLocaleString()}` })
          ;
        return interaction.reply({ embeds: [out] });
      }

      case 'balance': {
        const payload = createCofferEmbed(data.coffer, overflowTotal, data.overflowHolders, interaction.guild, data.shortFormat);
        return interaction.reply({ embeds: [payload.embed], components: [payload.row] });
      }

      case 'publish': {
        const channel = interaction.options.getChannel('channel');
        const { embed, row } = createCofferEmbed(data.coffer, overflowTotal, data.overflowHolders, interaction.guild, data.shortFormat);
        const msg = await channel.send({ embeds: [embed], components: [row] });

        data.publishedEmbed = { channelId: msg.channel.id, messageId: msg.id };
        await writeData(data);
        return interaction.reply({ content: `Published to ${channel}.`, ephemeral: true });
      }

      case 'transfer': {
        const amt = parseAmount(interaction.options.getString('amount'));
        if (amt > data.coffer) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Insufficient Funds')
                .setDescription(`Not enough in the coffer.`)
            ], ephemeral: true
          });
        }
        data.coffer -= amt;
        data.overflowHolders[userId] = (data.overflowHolders[userId] || 0) + amt;
        await writeData(data);
        await updatePublishedEmbed(data, interaction);
        const userNow = data.overflowHolders[userId];
        const tot = getOverflowTotal(data.overflowHolders);
        const done = new EmbedBuilder()
          .setTitle('<:Channels_Followed_white:1395781437449572455> Transfer Complete')
          .setColor(0x2980b9)
          .setDescription(
            `${mention} moved ${amt.toLocaleString()} from coffer to their overflow. ` +
            `Coffer: ${data.coffer.toLocaleString()}.`
          )
          .setFooter({ text: `Total Clan Funds: ${(tot + data.coffer).toLocaleString()}. Your Overflow Balance: ${userNow.toLocaleString()}` })
          ;
        return interaction.reply({ embeds: [done] });
      }
      case 'overflow-transfer': {
        const targetUser = interaction.options.getUser('target');
        const amt = parseAmount(interaction.options.getString('amount'));
        const senderId = interaction.user.id;
        const receiverId = targetUser.id;

        const senderBal = data.overflowHolders[senderId] || 0;
        if (amt > senderBal) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Insufficient Overflow')
                .setDescription(`You only have ${senderBal.toLocaleString()} overflow.`)
            ],
            ephemeral: true
          });
        }

        data.overflowHolders[senderId] = senderBal - amt;
        data.overflowHolders[receiverId] = (data.overflowHolders[receiverId] || 0) + amt;

        await writeData(data);
        await updatePublishedEmbed(data, interaction);

        const newSender = data.overflowHolders[senderId];
        const newReceiver = data.overflowHolders[receiverId];

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('<:Default_Role_Permissions:1394059545646596308> Overflow Transfer')
              .setColor(0x2980b9)
              .setDescription(
                `${interaction.user.toString()} sent ${amt.toLocaleString()} from their overflow to ${targetUser.toString()}.`)
              .setFooter({ text: `Your Remaining Overflow: ${newSender.toLocaleString()}` })
          ]
        });
      }
      case 'sweep': {
        // Only allow a specific ID (AFK Stacks) to run it in this case 
        const ALLOWED = '1026192544377356298';
        if (interaction.user.id !== ALLOWED) {
          return interaction.reply({
            content: '<:Engaged_in_suspected_spam_activ:1395170301498626058> only the primary overflow holder may run this.',
            ephemeral: true
          });
        }

        const targetUser = interaction.user;
        const targetId = interaction.user.id;

        const holderUser = interaction.options.getUser('holder');
        const holders = data.overflowHolders || {};

        // Sweep a single holder if provided
        if (holderUser) {
          const holderId = holderUser.id;

          if (holderId === targetId) {
            return interaction.reply({
              content: '<:Warning:1395170298197966981> You cannot target yourself for a selective sweep.',
              ephemeral: true
            });
          }

          const amt = holders[holderId] || 0;
          if (amt === 0) {
            return interaction.reply({
              content: '<:Warning:1395170298197966981> That member has no overflow to sweep.',
              ephemeral: true
            });
          }

          // zero the holder and credit the executor
          data.overflowHolders[holderId] = 0;
          data.overflowHolders[targetId] = (data.overflowHolders[targetId] || 0) + amt;

          await writeData(data);
          await updatePublishedEmbed(data, interaction);

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('<:Voice_Private_Event1:1394925300453998593> Selective Sweep Complete')
                .setDescription(`Moved ${amt.toLocaleString()} from ${holderUser.toString()} to ${targetUser.toString()}.`)
                .setColor('#e67e22')
                .setFooter({ text: `A tidy coffer is a happy coffer.` })
            ]
          });
        }

        // Sweeping everyone otherwise
        const totalSum = Object.values(holders).reduce((sum, v) => sum + v, 0);

        if (totalSum === 0) {
          return interaction.reply({
            content: '<:Warning:1395170298197966981> Nobody has any overflow to sweep!',
            ephemeral: true
          });
        }

        // Everybody set to 0
        for (const id of Object.keys(holders)) {
          data.overflowHolders[id] = 0;
        }

        // Write total to Stacks
        data.overflowHolders[targetId] = (data.overflowHolders[targetId] || 0) + totalSum;

        await writeData(data);
        await updatePublishedEmbed(data, interaction);

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('<:Voice_Private_Event1:1394925300453998593> Sweep Complete')
              .setDescription(`Overflow holdings totaling ${totalSum.toLocaleString()} have been consolidated under ${targetUser.toString()}.`)
              .setColor('#e67e22')
              .setFooter({ text: `A tidy coffer is a happy coffer.` })
          ]
        });
      }


      default:
        return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
  readData,
  getOverflowTotal,
  writeData,
  updatePublishedEmbed
};
