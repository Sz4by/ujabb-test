const OpenAI = require("openai");

// Az egész modult egy exportált függvényen belül tedd!
module.exports = function attachAnnaResponder(client, userId, excludedUserIds) {
  let activeUserId = null;
  let lastActive = null;
  let sessionTimeout = null;
  const TIMEOUT_MS = 30000;
  const userQuestionLimits = {};
  const MAX_QUESTIONS_PER_DAY = 5;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Helper a session timeout kezeléséhez:
  function startSessionTimeout(channel) {
    if (sessionTimeout) clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(async () => {
      if (activeUserId) {
        try {
          await channel.send('Letelt az idő, köszönöm a beszélgetést! Ha újra szeretnél kérdezni, írd, hogy "Szia Anna"! 😊');
        } catch (err) { }
        activeUserId = null;
        lastActive = null;
        sessionTimeout = null;
      }
    }, TIMEOUT_MS);
  }

  // --- MINDEN ESEMÉNYKEZELŐ EZEN A FÜGGVÉNYEN BELÜL! ---
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const userId = message.author.id;
    const contentLower = message.content.toLowerCase().trim();
    const today = new Date().toISOString().slice(0, 10);

    if (!userQuestionLimits[userId] || userQuestionLimits[userId].date !== today) {
      userQuestionLimits[userId] = { date: today, count: 0, warned: false };
    }

    const thanksRegex = /^k(ö|o)sz(i|önöm)?\s+anna\b/i;
    const greetRegex = /^szia\s+anna\b/i;

    // "Köszi Anna" esetén vége!
    if (
      activeUserId &&
      userId === activeUserId &&
      thanksRegex.test(contentLower)
    ) {
      activeUserId = null;
      lastActive = null;
      if (sessionTimeout) clearTimeout(sessionTimeout);
      sessionTimeout = null;
      try {
        await message.channel.send(`Szívesen! Ha bármi kell, csak szólj! 😉`);
      } catch (error) {
        console.error('Nem tudok válaszolni a szívesen-nel:', error);
      }
      return;
    }

    // NAPI LIMIT
    if (activeUserId && userId === activeUserId && userQuestionLimits[userId].count >= MAX_QUESTIONS_PER_DAY) {
      if (!userQuestionLimits[userId].warned) {
        await message.channel.send(`Elérted a napi ${MAX_QUESTIONS_PER_DAY} kérdés limitet. Holnap újra kérdezhetsz!`);
        userQuestionLimits[userId].warned = true;
      }
      return;
    }

    // --- EZ A RÉSZ AZ ÚJ FUNKCIÓ! ---
    // Ha van aktív session és egy MÁS user írja, hogy "Szia Anna":
    if (activeUserId && userId !== activeUserId && greetRegex.test(contentLower)) {
      await message.channel.send('Bocsánat, most éppen mással beszélgetek! Amint végeztem, újra írhatsz egy “Szia Anna”-t és segítek neked is! 😊');
      return;
    }

    // Új session indítása csak, ha nincs aktív user!
    if (!activeUserId && greetRegex.test(contentLower)) {
      activeUserId = userId;
      lastActive = Date.now();
      await message.channel.send(`Szia! Miben segíthetek? 😊`);
      startSessionTimeout(message.channel);
      return;
    }

    // Ha session aktív, de NEM ő ír (és nem próbál "szia anna"-t), ignoráljuk
    if (activeUserId && userId !== activeUserId) {
      return;
    }

    // Aktív user kérdez
    if (activeUserId && userId === activeUserId) {
      userQuestionLimits[userId].count += 1;
      lastActive = Date.now();
      startSessionTimeout(message.channel);

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Te vagy Anna, egy kedves segítőkész asszisztens." },
            { role: "user", content: message.content }
          ],
        });
        const answer = response.choices[0].message.content.trim();
        await message.channel.send(answer);
      } catch (error) {
        await message.channel.send('Sajnálom, valami hiba történt a válaszadás közben.');
      }
      return;
    }
  });
};
