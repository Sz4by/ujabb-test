require('dotenv').config();

const express = require('express');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');

// Modulok importálása
const musicPlayer = require('./modules/musicPlayer.js'); // Helyes fájlútvonal a modules mappában lévő musicPlayer.js fájlhoz

const app = express();
const PORT = process.env.PORT || 3000;
const userId = process.env.DISCORD_USER_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ---------- SLASH PARANCSOK BETÖLTÉSE ----------
client.commands = new Collection();
const commands = [];
const commandsPath = path.join(__dirname, 'commands/music'); // A parancsok a 'commands/music' mappában vannak
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }
  }
}
// -------------------------------------------------

const excludedUserIds = [
  '1095731086513930260',
  '638815489795293202'
];

let currentStatus = 'offline';
let currentUserData = null;
let statusChangeTime = null;

client.once('ready', async () => {
  console.log(`Bot elindult: ${client.user.tag}`);

  // Guild ID: Cseréld ki a saját szervered ID-jával
  const guildId = '1110172753308422184'; // Itt a guild ID

  // Slash parancsok regisztrálása egy szerverre (guild-id használatával)
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, guildId), // Itt használjuk a guildId-t
      { body: commands }
    );
    console.log('✅ Slash parancsok regisztrálva a szerverre.');
  } catch (error) {
    console.error('❌ Slash parancs regisztráció hiba:', error);
  }

  // Modulok betöltése
  const modulesPath = path.join(__dirname, 'modules');
  if (fs.existsSync(modulesPath)) {
    fs.readdirSync(modulesPath).forEach(file => {
      if (file.endsWith('.js')) {
        try {
          require(path.join(modulesPath, file))(client, userId, excludedUserIds);
          console.log(`Betöltve: ${file}`);
        } catch (err) {
          console.error(`Hiba a modul betöltésénél (${file}):`, err);
        }
      }
    });
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    // Ellenőrizzük, hogy az interakció már le lett-e válaszolva
    if (!interaction.replied) {
      await interaction.deferReply(); // Késleltetett válasz
    }
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Hiba történt a parancs végrehajtása közben.', ephemeral: true });
    } else {
      await interaction.followUp({ content: '❌ Hiba történt a parancs végrehajtása közben.', ephemeral: true });
    }
  }
});

// Zenelejátszó parancsok
async function play(guild, song, interaction) {
  await musicPlayer.playSong(guild, song, interaction); // A playSong függvény meghívása az objektumból
}

async function joinVoiceChannel(interaction) {
  await musicPlayer.joinChannel(interaction); // A joinChannel függvény meghívása az objektumból
}

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: currentStatus,
    userData: currentUserData || {},
    statusChangeTime: statusChangeTime ? statusChangeTime.toISOString() : null
  });
});

// Root endpoint, HTML oldal megjelenítése
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Discord Státusz</title></head>
      <body>
        <h1>Discord Státusz</h1>
        <div id="status">
          <p>Status: <span id="status-text">${currentStatus}</span></p>
          <p id="username">Felhasználó: ${currentUserData ? currentUserData.username : "Ismeretlen"}</p>
          <img src="${currentUserData ? `https://cdn.discordapp.com/avatars/${userId}/${currentUserData.avatar}.png` : ""}" alt="Profilkép" width="100" height="100" />
          <p id="status-time">Státusz óta: --</p>
        </div>
        <script>
          setInterval(async () => {
            const res = await fetch('/status');
            const data = await res.json();

            document.getElementById('status-text').innerText = data.status;
            document.getElementById('username').innerText = 'Felhasználó: ' + (data.userData.username || 'Ismeretlen');
            document.querySelector('img').src = data.userData.avatar ? \`https://cdn.discordapp.com/avatars/${userId}/\${data.userData.avatar}.png\` : '';

            if(data.statusChangeTime){
              const since = new Date(data.statusChangeTime);
              const diffMs = Date.now() - since.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffSecs = Math.floor((diffMs % 60000) / 1000);
              document.getElementById('status-time').innerText = \`Státusz óta: \${diffMins} perc \${diffSecs} másodperc\`;
            } else {
              document.getElementById('status-time').innerText = 'Státusz óta: --';
            }
          }, 5000);
        </script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Webszerver fut a ${PORT} porton`);
});

client.login(process.env.DISCORD_BOT_TOKEN);
