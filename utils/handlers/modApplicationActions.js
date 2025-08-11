const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { getInfoConfig, loadRoleMappings } = require('./configHelper.js')

//bad but hardcoding here
// mod_application
const ROLE_ID_1 = '923269580971982869';
// event_coordinator
const ROLE_ID_2 = '1336019722151395368';


const APP_TYPE_DISPLAY = {
  mod_application: 'Moderator',
  event_coordinator: 'Event Coordinator',
};

async function handleModApplicationAction(interaction) {
  const { customId, guild, message, client, member: moderator } = interaction;
  const parts = customId.split('_');
  const action = parts[1];
  const userId = parts[2];
  const rest = parts.slice(3);
  const isAccept = action === 'accept';
  const appType = rest.join('_') || 'unknown';

  const appLabel = APP_TYPE_DISPLAY[appType] || appType.replace('_', ' ');
  const { applicationLogId } = await getInfoConfig();

  try {
    const applicant = await guild.members.fetch(userId);
    const logChannel = await client.channels.fetch(applicationLogId);

    // const appLabel = appType.replace('_', ' ');
    const applicantName = applicant.nickname || applicant.user.username;
    const applicantMention = `<@${applicant.id}>`;
    const moderatorMention = `<@${moderator.id}>`;
    const moderatorName = moderator.nickname || moderator.user.username;
    const actionWord = isAccept ? 'accepted' : 'denied';

    const dmEmbed = new EmbedBuilder()
      .setTitle(isAccept ? '✅ Application Accepted' : '❌ Application Denied')
      .setDescription(
        isAccept
          ? `You have been accepted for the **${appLabel}** position! Welcome!`
          : `Your application for the **${appLabel}** role was not accepted. Thanks for applying.`
      )
      .setColor(isAccept ? 0x2ecc71 : 0xe74c3c)
      .setTimestamp();

    await applicant.send({ embeds: [dmEmbed] });

    if (isAccept) {
      const roleToAssign = appType === 'mod_application' ? ROLE_ID_1 : ROLE_ID_2;
      await applicant.roles.add(roleToAssign);
    }

    // Respond to mod interaction
    // if (!interaction.replied && !interaction.deferred) {
    //   await interaction.reply({ content: `Application has been ${actionWord}.`, ephemeral: true });
    // } else {
    //   await interaction.followUp({ content: `Application ${actionWord}.`, ephemeral: true });
    // }
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferUpdate();
    }

    await message.delete();

    const logEmbed = new EmbedBuilder()
      .setTitle(`Application ${actionWord.charAt(0).toUpperCase() + actionWord.slice(1)}`)
      .setDescription(`${moderatorMention} has ${actionWord} ${applicantMention} (${applicantName})'s application for **${appLabel}**.`)
      .setColor(isAccept ? 0x2ecc71 : 0xe74c3c)
      .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });

    const freshDropdown = new StringSelectMenuBuilder()
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
        },
      ]);

    const freshRow = new ActionRowBuilder().addComponents(freshDropdown);
    const persistentMessage = await logChannel.messages.fetch(message.id).catch(() => null);
    if (persistentMessage) {
      await persistentMessage.edit({ components: [freshRow] });
    }

  } catch (error) {
    console.error('Error in mod action handler:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'There was an error handling the application decision.', ephemeral: true });
    }
  }
}

module.exports = { handleModApplicationAction };
