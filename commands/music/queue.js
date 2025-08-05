const { SlashCommandBuilder } = require('discord.js');
const { queue } = require('../../modules/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Megjeleníti a zene sort'),

    async execute(interaction) {
        const serverQueue = queue.get(interaction.guild.id);

        if (!serverQueue || !serverQueue.songs.length) {
            return interaction.reply('🎶 A sor üres.');
        }

        const queueList = serverQueue.songs
            .map((song, index) => `${index + 1}. ${song.title}`)
            .join('\n');

        interaction.reply(`🎶 **Zene sor:**\n${queueList}`);
    }
};