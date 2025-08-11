const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const fs = require('node:fs/promises');
const path = require('node:path');

const { announceBirthdays, getBirthdays, getNYMonthDay } = require('../../utils/scheduler/birthdayAnnouncerHelpers');
const DATA_FILE = path.join(__dirname, '../../data/birthdays.json');

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '{}', 'utf8');
  }
}

async function readDb() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  try {
    const db = JSON.parse(raw || '{}');
    return typeof db === 'object' && db ? db : {};
  } catch {
    return {};
  }
}

async function writeDb(db) {
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Birthday tools')
    .addSubcommand(sub =>
      sub
        .setName('entry')
        .setDescription('Save your birthday or someone else')
        .addIntegerOption(opt =>
          opt
            .setName('month')
            .setDescription('Month (1-12)')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt
            .setName('day')
            .setDescription('Day of month')
            .setRequired(true)
        )
        .addUserOption(opt =>
          opt
            .setName('member')
            .setDescription('(Optional) member to save birthday for')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('call')
        .setDescription('Manually announce birthdays')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('(Optional) only announce this person\'s birthday')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'entry') {
      const target = interaction.options.getUser('member') || interaction.user;
      const month = interaction.options.getInteger('month', true);
      const day = interaction.options.getInteger('day', true);
      //await interaction.deferReply({});

      // Validating month/day combo here
      const monthLengths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (month < 1 || month > 12) {
        return interaction.reply({ content: `<:Warning:1395170298197966981> Month must be between 1 and 12.`, flags: MessageFlags.Ephemeral });
      }
      const maxDay = monthLengths[month - 1];
      if (day < 1 || day > maxDay) {
        return interaction.reply({ content: `<:Warning:1395170298197966981> Day must be between 1 and ${maxDay} for month ${month}.`, flags: MessageFlags.Ephemeral });
      }

      //const userId = interaction.user.id;
      const db = await readDb();
      db[target.id] = { month, day };
      await writeDb(db);

      {
        const embed = new EmbedBuilder()
          .setColor('#00AEFF')
          .setTitle('<:Birthday_Discord_white_theme:1402807879127400592> Birthday Saved')
          .setDescription(`Saved ${target.toString()}'s birthday as **${month}/${day}**.`)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    }

    if (sub === 'call') {

      const MOD_ROLE_ID = '923269580971982869';
      if (!interaction.member.roles.cache.has(MOD_ROLE_ID)
        && !interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content:
            '❌ You must be a mod or have higher permissions to manually announce birthdays.',
          flags: MessageFlags.Ephemeral
        });
      }

      // await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const channel = await interaction.client.channels.fetch('923708919568801823');
      const optUser = interaction.options.getUser('user');

      const { month, day } = getNYMonthDay();
      const userIds = await getBirthdays({ month, day, targetUserId: optUser?.id });

      if (userIds.length === 0) {
        return interaction.reply({
          content: optUser
            ? `❌ <@${optUser.id}> doesn\'t have a birthday saved for today.`
            : `❌ No birthdays found for today.`,
          flags: MessageFlags.Ephemeral
        });
      }

      await announceBirthdays(channel, interaction.client, userIds);
      // return interaction.reply({ content: 'Birthday announcement sent!', flags: MessageFlags.Ephemeral });
      {
        const embed = new EmbedBuilder()
          .setColor('#00AEFF')
          .setTitle('<:Birthday_Discord_white_theme:1402807879127400592> Birthday Announcement sent!')
          .setDescription(`Check it out here!: <#${channel}>`)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    }
  }
};