const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');

const queue = new Map();

module.exports = {
    queue,

    // A zene lejátszása
    async playSong(guild, song, interaction) {
        const serverQueue = queue.get(guild.id);

        if (!song) {
            serverQueue.voiceConnection.destroy();
            queue.delete(guild.id);
            return;
        }

        const stream = await play.stream(song.url);
        const resource = createAudioResource(stream.stream, { inputType: stream.type });

        serverQueue.audioPlayer.play(resource);
        serverQueue.audioPlayer.on(AudioPlayerStatus.Idle, () => {
            serverQueue.songs.shift();
            this.playSong(guild, serverQueue.songs[0], interaction);
        });

        interaction.followUp(`🎶 Most játszva: **${song.title}**`);
    },

    // Hangcsatornába belépés
    joinChannel(interaction) {
        return joinVoiceChannel({
            channelId: interaction.member.voice.channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });
    }
};
