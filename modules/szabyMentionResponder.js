// szabyMentionResponder.js
module.exports = (client, userId, excludedUserIds = []) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (excludedUserIds.includes(message.author.id)) return;

    const isUserMentioned = message.mentions.users.has(userId);
    const textMentioned = message.content.toLowerCase().includes('szaby') ||
                          message.content.toLowerCase().includes('sz4by');

    if (isUserMentioned) {
      await message.channel.send(`Ne zavard a főnökömet, ${message.author}!`);
    } else if (textMentioned) {
      await message.channel.send('Valaki említette a Szaby nevet!');
    }
  });
};
