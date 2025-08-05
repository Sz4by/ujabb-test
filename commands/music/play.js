const { SlashCommandBuilder } = require('discord.js');
const play = require('play-dl');
const { queue, playSong, joinChannel } = require('../../modules/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Lejátszik egy zenét')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('YouTube URL vagy keresőszó')
                .setRequired(true)),

    async execute(interaction) {
        const query = interaction.options.getString('url');

        if (!interaction.member.voice.channel) {
            return interaction.reply({ content: 'Csatlakozz egy voice csatornához!', ephemeral: true });
        }

        await interaction.deferReply();

        let songInfo;
        if (play.yt_validate(query) === 'video') {
            const ytInfo = await play.video_info(query);
            songInfo = {
                title: ytInfo.video_details.title,
                url: ytInfo.video_details.url
            };
        } else {
            const searchResult = await play.search(query, { limit: 1 });
            if (!searchResult.length) return interaction.followUp('Nem található zene.');
            songInfo = {
                title: searchResult[0].title,
                url: searchResult[0].url
            };
        }

        let serverQueue = queue.get(interaction.guild.id);

        if (!serverQueue) {
            const connection = joinChannel(interaction);
            const audioPlayer = createAudioPlayer();

            connection.subscribe(audioPlayer);

            serverQueue = {
                voiceConnection: connection,
                audioPlayer: audioPlayer,
                songs: []
            };

            queue.set(interaction.guild.id, serverQueue);
        }

        serverQueue.songs.push(songInfo);

        if (serverQueue.songs.length === 1) {
            playSong(interaction.guild, songInfo, interaction);
        } else {
            interaction.followUp(`✅ Hozzáadva a sorhoz: **${songInfo.title}**`);
        }
    }
};