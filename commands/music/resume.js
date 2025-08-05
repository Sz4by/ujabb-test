const { SlashCommandBuilder } = require('discord.js');
const { queue } = require('../../modules/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Folytatja a lejátszást'),

    async execute(interaction) {
        const serverQueue = queue.get(interaction.guild.id);

        if (!serverQueue) return interaction.reply('❌ Nincs zene a sorban.');

        serverQueue.audioPlayer.unpause();
        interaction.reply('▶️ Zene folytatva.');
    }
};