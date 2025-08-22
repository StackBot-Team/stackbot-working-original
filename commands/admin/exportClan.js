const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, MessageFlags } = require('discord.js');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/output.json');

module.exports = {
   data: new SlashCommandBuilder()
      .setName('export-members')
      .setDescription('Retrieve the current member data for download.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

   async execute(interaction) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
         return interaction.reply({ content: '<:Engaged_in_suspected_spam_activ:1395170301498626058> This command requires higher privileges.', flags: MessageFlags.Ephemeral });
      }

      const fileName = `afkstack_member_export_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;

      const attachment = new AttachmentBuilder(DATA_FILE, { name: fileName });

      return interaction.reply({
         content: '<:Auditlog_mobile:1394059294365978704> Here\'s the latest snapshot of the clan for download:',
         files: [attachment],
         flags: MessageFlags.Ephemeral
      });
   }
};
