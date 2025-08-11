const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit')
    .setDescription('Create, update, or delete questions in a DM'),

  async execute(interaction) {
    //await interaction.reply({ content: '👋 Check your DMs to edit questions!', ephemeral: true });
    const dmNotice = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Staff Application Editor')
      .setDescription('Check your DMs to begin making your edits!')
      .setTimestamp();

    await interaction.reply({
      embeds: [dmNotice],
      ephemeral: false
    });
    const dm = await interaction.user.createDM();
    const filter = msg => msg.author.id === interaction.user.id;

    const COLLECT_OPTIONS = {
      filter,
      max: 1,
      time: 5 * 60 * 1000,
      errors: ['time']
    };

    const makeEmbed = (title, desc) =>
      new EmbedBuilder()
        .setTitle(title)
        .setDescription(desc)
        .setColor(0x0099ff);

    const filePath = path.resolve(__dirname, '../../data/questions.json');
    let questions;
    try {
      questions = JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch {
      questions = { mod_application: [], event_coordinator: [] };
    }

    let setKey;
    while (!setKey) {
      await dm.send({ embeds: [makeEmbed('Select Question Set', 'Reply with **mod** or **event**, or **exit** to cancel.')] });
      const reply = (await dm.awaitMessages(COLLECT_OPTIONS)).first().content.trim().toLowerCase();
      if (reply === 'exit') return dm.send({ embeds: [makeEmbed('Aborted', 'No changes saved.')] });
      if (reply === 'mod') setKey = 'mod_application';
      else if (reply === 'event') setKey = 'event_coordinator';
      else await dm.send({ embeds: [makeEmbed('Blistering barnacles!', 'Please reply **mod**, **event**, or **exit**.')] });
    }

    while (true) {
      const list = questions[setKey]
        .map((q, i) => `\`${i + 1}.\` ${q}`)
        .join('\n') || '_(no questions yet)_';
      await dm.send({
        embeds: [makeEmbed(
          `Current ${setKey.replace('_', ' ')} application`,
          `${list}\n\nReply with **create**, **update**, **delete**, or **exit** to save & quit.`
        )]
      });

      // const action = (await dm.awaitMessages(COLLECT_OPTIONS)).first().content.trim().toLowerCase();
      let action;
      try {
        const collected = await dm.awaitMessages(COLLECT_OPTIONS);
        action = collected.first().content.trim().toLowerCase();
      } catch (e) {

        await dm.send({
          embeds: [
            makeEmbed('Session Expired', 'Ending our interaction since I didn\'t hear from you for 5 minutes. Any changes have been saved and you can start again with `/editquestions`.')
          ]
        });
        break;
      }
      if (action === 'exit') break;

      if (action === 'create') {
        await dm.send({ embeds: [makeEmbed('Create Question', 'Type the **new** question:')] });
        const newQ = (await dm.awaitMessages(COLLECT_OPTIONS)).first().content.trim();
        questions[setKey].push(newQ);
        await dm.send({ embeds: [makeEmbed('Added', `"${newQ}" has been added.`)] });

      } else if (action === 'update') {
        if (!questions[setKey].length) {
          await dm.send({ embeds: [makeEmbed('Nothing to Update', 'Your list is empty.')] });
          continue;
        }
        await dm.send({ embeds: [makeEmbed('Update Question', 'Reply with the **number** to update:')] });
        const idx = parseInt((await dm.awaitMessages(COLLECT_OPTIONS)).first().content, 10);
        if (!idx || idx < 1 || idx > questions[setKey].length) {
          await dm.send({ embeds: [makeEmbed('Invalid Number', 'Please send a valid index number.')] });
          continue;
        }
        await dm.send({
          embeds: [makeEmbed(
            'Editing',
            `Current: "${questions[setKey][idx - 1]}"\nType the **new** text:`
          )]
        });
        const updated = (await dm.awaitMessages(COLLECT_OPTIONS)).first().content.trim();
        questions[setKey][idx - 1] = updated;
        await dm.send({ embeds: [makeEmbed('Updated', `Question ${idx} is now:\n"${updated}"`)] });

      } else if (action === 'delete') {
        if (!questions[setKey].length) {
          await dm.send({ embeds: [makeEmbed('Nothing to Delete', 'Your list is empty.')] });
          continue;
        }
        await dm.send({ embeds: [makeEmbed('Delete Question', 'Reply with the **number** to delete:')] });
        const idx = parseInt((await dm.awaitMessages(COLLECT_OPTIONS)).first().content, 10);
        if (!idx || idx < 1 || idx > questions[setKey].length) {
          await dm.send({ embeds: [makeEmbed('Invalid Number', 'Please use a valid index number.')] });
          continue;
        }
        const [removed] = questions[setKey].splice(idx - 1, 1);
        await dm.send({ embeds: [makeEmbed('Question Deleted', `"${removed}" has been removed.`)] });

      } else {
        await dm.send({ embeds: [makeEmbed('Unknown Action', 'Please choose **create**, **update**, **delete**, or **exit**.')] });
      }
    }

    await fs.writeFile(filePath, JSON.stringify(questions, null, 2));
    await dm.send({ embeds: [makeEmbed('Edits Saved', 'Your changes have been applied.')] });
  },
};
