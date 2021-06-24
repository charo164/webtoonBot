require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { isAcceptedExtension, getDataAndClean, structureData } = require('./libs/file_and_data');
const fetch = require('./libs/fetch');

let bot = new TelegramBot();
/**
 * Server
 */
if (process.env.NODE_ENV === 'development') {
  bot = new TelegramBot(process.env.TOKEN, {
    polling: true,
  });
} else {
  const express = require('express');
  bot = new TelegramBot(process.env.TOKEN);
  const app = express();
  app.use(express.json());
  bot.setWebHook(`${process.env.URL}:443/bot${process.env.TOKEN}`);
  app.post(`/bot${process.env.TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
  app.get('*', (req, res) => {
    res.status(404).send('Not found !');
  });
  app.listen(process.env.PORT, () => {
    console.log(`Express server is listening on ${process.env.PORT}`);
  });
}

/**
 *
 * @param {TelegramBot.Message} msg
 * @returns void
 */
const upload = async (msg) => {
  const fileName = msg.document.file_name;

  if (!isAcceptedExtension(fileName)) {
    bot.sendMessage(msg.chat.id, 'File type no accepted❗️');
    return 0;
  }
  const liteFile = await fetch.downloadLiteFile(bot, msg);
  const data = await getDataAndClean(liteFile);
  const webtoon = await structureData(data);
  bot.sendPhoto(process.env.CHANNEL_ID, webtoon.img, {
    parse_mode: 'HTML',
    caption: `💠 <a>Title :</a> ${webtoon.title}
💠 <a>Synopsis :</a> ${webtoon.synopsis}
`,
  });
  webtoon.episodes.forEach(async (episode, i) => {
    setTimeout(() => {
      fetch
        .downloader(episode.url, `${webtoon.title} - chapiter ${i}`)
        .then(async (webtoonFile) => {
          await bot
            .sendDocument(process.env.CHANNEL_ID, webtoonFile, { caption: `chapiter ${i}` })
            .then(() => {
              fs.rmSync(webtoonFile);
            });
          if (i === webtoon.episodes.length - 1) bot.sendMessage(process.env.CHANNEL_ID, '🔚');
        })
        .catch((err) => {
          console.log(err);
        });
    }, i * 4000);
  });
};

bot.on('document', async (msg) => {
  upload(msg).catch(() => {
    bot.sendMessage(msg.chat.id, 'Error ❗️');
  });
});
