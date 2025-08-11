const fs = require('fs/promises');
const path = require('path');
const EVENTS_PATH = path.resolve(__dirname, '../../data/betterEvents.json');

let eventsData = {};

async function loadEvents() {
  try {
    const data = await fs.readFile(EVENTS_PATH, 'utf8');
    eventsData = JSON.parse(data);
  } catch (err) {
    console.error("Could not load events.json, starting with an empty object.", err);
    eventsData = {};
  }
}

async function saveEvents() {
  try {
    await fs.writeFile(EVENTS_PATH, JSON.stringify(eventsData, null, 2));
  } catch (err) {
    console.error("Error writing events.json:", err);
  }
}

function setEvent(id, data) {
  eventsData[id] = data;
  return saveEvents();
}

function getEvent(id) {
  return eventsData[id];
}


function getAllEvents() {
  return eventsData;
}

loadEvents();

module.exports = {
  setEvent,
  getEvent,
  getAllEvents,
  loadEvents,
  saveEvents,
};
