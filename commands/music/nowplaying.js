const { SlashCommandBuilder } = require('discord.js');
const { queue } = require('../../modules/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Mutatja, hogy mi szól éppen'),

    async execute(interaction) {
        const serverQueue = queue.get(interaction.guild.id);

        if (!serverQueue || !serverQueue.songs.length) {
            return interaction.reply('❌ Nem szól jelenleg semmi.');
        }

        interaction.reply(`🎧 Most szól: **${serverQueue.songs[0].title}**`);
    }
};