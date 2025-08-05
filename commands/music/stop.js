const { SlashCommandBuilder } = require('discord.js');
const { queue } = require('../../modules/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Leállítja a lejátszást és kilép'),

    async execute(interaction) {
        const serverQueue = queue.get(interaction.guild.id);

        if (!serverQueue) return interaction.reply('❌ Nincs zene amit le lehetne állítani.');

        serverQueue.songs = [];
        serverQueue.audioPlayer.stop();
        serverQueue.voiceConnection.destroy();
        queue.delete(interaction.guild.id);

        interaction.reply('⏹ Lejátszás leállítva és kilépett.');
    }
};