require('dotenv').config();

const express = require('express');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');

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
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFolders = fs.readdirSync(commandsPath);
  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
      }
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

  // Slash parancsok regisztrálása
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ Slash parancsok regisztrálva.');
  } catch (error) {
    console.error('❌ Slash parancs regisztráció hiba:', error);
  }

  // Gépelés jelzése
  const typingChannelIds = [
    '1158023970872889354',
    '1158023983816515685',
  ];
  let currentTypingIndex = 0;
  setInterval(() => {
    const channelId = typingChannelIds[currentTypingIndex];
    const channel = client.channels.cache.get(channelId);
    if (channel) channel.sendTyping().catch(console.error);
    currentTypingIndex = (currentTypingIndex + 1) % typingChannelIds.length;
  }, 9000);

  // Automatikus státusz váltogatás dnd és idle között
  let toggleStatus = false;
  setInterval(() => {
    toggleStatus = !toggleStatus;
    const newStatus = toggleStatus ? 'dnd' : 'idle';
    client.user.setPresence({ status: newStatus });
    console.log(`Státusz váltva: ${newStatus}`);
  }, 5 * 1000);

  // Egyedi státusz szövegek
  const customStatuses = [
    "💻 Kódolok éppen...",
    "🚀 Online vagyok, ne zavarj!",
    "🌙 Álmos vagyok, de elérhető!",
    "🔥 A legjobb bot vagyok!",
    "😎 Modern státusz! Szaby edition."
  ];
  let customStatusIndex = 0;
  setInterval(() => {
    client.user.setPresence({
      activities: [{
        name: customStatuses[customStatusIndex],
        type: 4
      }],
      status: client.presence?.status || 'online'
    });
    customStatusIndex = (customStatusIndex + 1) % customStatuses.length;
  }, 15000);

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
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '❌ Hiba történt a parancs végrehajtása közben.', ephemeral: true });
  }
});

client.on('presenceUpdate', (oldPresence, newPresence) => {
  if (!newPresence || !newPresence.user) return;
  if (newPresence.user.id === userId) {
    currentStatus = newPresence.status || 'offline';
    statusChangeTime = new Date();

    currentUserData = {
      username: newPresence.user.username,
      discriminator: newPresence.user.discriminator,
      avatar: newPresence.user.avatar,
      activities: newPresence.activities || []
    };
    console.log(`Státusz változott: ${currentStatus}`);
  }
});

app.get('/status', (req, res) => {
  res.json({
    status: currentStatus,
    userData: currentUserData || {},
    statusChangeTime: statusChangeTime ? statusChangeTime.toISOString() : null
  });
});

app.get('/', (req, res) => {
  res.send(\`
    <html>
      <head><title>Discord Státusz</title></head>
      <body>
        <h1>Discord Státusz</h1>
        <div id="status">
          <p>Status: <span id="status-text">\${currentStatus}</span></p>
          <p id="username">Felhasználó: \${currentUserData ? currentUserData.username : "Ismeretlen"}</p>
          <img src="\${currentUserData ? \`https://cdn.discordapp.com/avatars/\${userId}/\${currentUserData.avatar}.png\` : ""}" alt="Profilkép" width="100" height="100" />
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
  \`);
});

app.listen(PORT, () => {
  console.log(`Webszerver fut a ${PORT} porton`);
});

client.login(process.env.DISCORD_BOT_TOKEN);