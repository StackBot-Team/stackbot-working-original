![Version](https://img.shields.io/badge/version-v3.0.0-blue)

<center><img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=200&section=header&text=StackBot&fontSize=80&fontAlignY=35&animation=twinkling&fontColor=gradient" /></center>

<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="http://discord.gg/stackbot">
    <img src="https://i.imgur.com/ngVdVdA.png" alt="StackBot" width="200" height="200">
  </a>

  <h3 align="center">Desc iption</h3>

  <p align="center">
    A Discord bot prov iding solddutions for managing Old School RuneScape Clans, built with <a href="https://discord.js.org">Discord.js</a>, and <a href="https://nodejs.org/en">Node.js</a>. This bot is plug and play once downloaded and ideal for self hosting on a computer you can keep on. 
    <br />
    <br />
    <a href="https://github.com/StackBot-Team/old-version-stackbot/issues">Report Bug</a>
    ·
    <a href="https://github.com/StackBot-Team/old-version-stackbot/issues">Request Feature</a>
  </p>
</p>

## <img src="https://cdn.discordapp.com/emojis/852881450667081728.gif" width="20px" height="20px">》Feature
- [x] Slash Commands 
- [x] Upto date with Discord.js v14
- [x] Utility Commands
- [x] Fun Commands
- [x] Easy to use
- [x] And much more

# APIs & Integrations

Below is a quick overview of the external APIs this bot talks to:

- **Discord API**   
  • Docs: https://discord.com/developers/docs/intro

- **Wise Old Man API**      
  • Docs: https://docs.wiseoldman.net/

- **OSRS Wiki API**   
  • Docs: https://oldschool.runescape.wiki/api.php

--- 

## Prerequisites

- **Git/Github** (v2.0+): to clone the repo and manage versions

- **Node.js** (v20+ newer): includes npm for installing dependencies

- **npm** (comes with Node.js) to install packages and run scripts

- **VSCode** or another code editor for development 


---

## Installation

1. **Clone the repo**  
   ```bash
   git clone https://github.com/StackBot-Team/old-version-stackbot.git
   cd stackbot-discord-bot

2. **Rename `.env.example` to `.env` and fill in all variables**
   ```bash
   TOKEN="YOUR-BOT-TOKEN"
   CLIENT_ID="YOUR-CLIENT-ID"
   ...

3. **Install node packages**
   ```bash 
    npm i

## Discord Developer Portal (Optional Fresh Setup)
1. Create a new application
2. Settings>Installation 
   * Select Methods ```User Install``` and ```Guild Install``
   * Install Link ```None```
3. Settins>Bot 
   * Reset & copy ```Token``` to .env file
   * Public Bot ```off```
   * Presence Intent ```on```
   * Server Members Intent ```on```
   * Message Content Intent ```on```
4. Settings>OAuth2
   * Copy ```Client ID``` to .env file
   * OAuth2 URL Generator: Scopes 
      * check ```bot```
      * check ```applications.commands```
   * Bot Permissions
      * check ```Administrator```
   * Integration Type
      * ```Guild Install```
   * Generated URL
      * Copy and add bot to your guild

## Cloud Hosting
1. **Caution**

   If you decide to host in the cloud, the data folder will need to be excluded in futuer pulls to your cloud host to avoid pulling the old clan member. 

2. **Git Pull Approach**
    ```bash
    git update-index --skip-worktree ./data/output.json
    git pull origin main
   

## Running

1. **Command Deployment**
    ```bash
    npm run deploy

2. **Start Bot**
    ```bash
    npm run start

## Support
1. [discord.gg/stackbot]()"# example1" 
