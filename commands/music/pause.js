const { SlashCommandBuilder } = require('discord.js');
const { queue } = require('../../modules/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Szünetelteti a lejátszást'),

    async execute(interaction) {
        const serverQueue = queue.get(interaction.guild.id);

        if (!serverQueue) return interaction.reply('❌ Nincs zene lejátszva.');

        serverQueue.audioPlayer.pause();
        interaction.reply('⏸ Zene szüneteltetve.');
    }
};