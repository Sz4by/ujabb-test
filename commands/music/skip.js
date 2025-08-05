const { SlashCommandBuilder } = require('discord.js');
const { queue } = require('../../modules/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Kihagyja az aktuális zenét'),

    async execute(interaction) {
        const serverQueue = queue.get(interaction.guild.id);

        if (!serverQueue || !serverQueue.songs.length) {
            return interaction.reply('❌ Nincs zene amit ki lehetne hagyni.');
        }

        serverQueue.audioPlayer.stop();
        interaction.reply('⏭ Zene kihagyva.');
    }
};