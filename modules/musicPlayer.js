// modules/musicPlayer.js

const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior, getVoiceConnection } = require('@discordjs/voice');
const playdl = require('play-dl');

const queue = new Map();
const players = new Map();

// Képzett függvények az alap műveletekhez
function getQueue(guildId) {
    if (!queue.has(guildId)) queue.set(guildId, []);
    return queue.get(guildId);
}

function getPlayer(guildId) {
    if (!players.has(guildId)) {
        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            }
        });
        players.set(guildId, player);
    }
    return players.get(guildId);
}

// A zene lejátszása a várólistáról
async function playNext(guild, textChannel) {
    const queue = getQueue(guild.id);
    if (!queue.length) {
        const conn = getVoiceConnection(guild.id);
        if (conn) conn.destroy();
        await textChannel.send({ embeds: [{ color: 'Red', description: "A várólista üres, leálltam." }] });
        return;
    }

    const song = queue[0];
    let stream;
    try {
        stream = await playdl.stream(song.url, { quality: 2 });
    } catch (e) {
        queue.shift();
        await textChannel.send({ embeds: [{ color: 'Red', description: "Hiba történt a zene lejátszásakor, átugrom!" }] });
        return playNext(guild, textChannel);
    }

    const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
    });

    const player = getPlayer(guild.id);
    player.play(resource);

    player.once(AudioPlayerStatus.Playing, () => {
        textChannel.send({
            embeds: [ {
                color: 'Blue',
                title: 'Most játszom:',
                description: `[${song.title}](${song.url})`,
                thumbnail: { url: song.thumbnail },
                fields: [{ name: 'Kérte:', value: `<@${song.requester}>`, inline: true }]
            }]
        });
    });

    player.once(AudioPlayerStatus.Idle, () => {
        queue.shift();
        playNext(guild, textChannel);
    });

    let conn = getVoiceConnection(guild.id);
    if (!conn) {
        conn = joinVoiceChannel({
            channelId: song.voiceChannel,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator
        });
    }
    conn.subscribe(player);
}

// Modulok exportálása
module.exports = {
    queue,
    getQueue,
    getPlayer,
    playNext,
    // Belépés a hangcsatornába
    joinChannel: async function (interaction) {
        return joinVoiceChannel({
            channelId: interaction.member.voice.channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });
    },
    // Zene lejátszása
    playSong: async function (guild, song, interaction) {
        await playNext(guild, interaction.channel);
    }
};
