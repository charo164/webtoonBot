require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const {
  isAcceptedExtension,
  getDataAndClean,
  structureData,
  getQueue,
  isUploading,
} = require('./libs/file_and_data');
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
  app.get('/', (req, res) => {
    res.status(200).send('OK');
  });
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
const upload = async (webtoon) => {
  bot.sendPhoto(process.env.CHANNEL_ID, webtoon.img, {
    parse_mode: 'HTML',
    caption: `💠 <a>Title :</a> ${webtoon.title}
💠 <a>Synopsis :</a> ${webtoon.synopsis}
`,
  });
  const rapport = await bot.sendMessage(webtoon.chat_id, 'Starting...');
  const total = webtoon.episodes.length;
  let current = 1;
  webtoon.episodes.forEach(async (episode, i) => {
    setTimeout(() => {
      fetch
        .downloader(episode.url, `${webtoon.title} - chapiter ${i}`)
        .then(async (webtoonFile) => {
          await bot
            .sendDocument(process.env.CHANNEL_ID, webtoonFile, { caption: `chapiter ${i}` })
            .then(() => {
              fs.rmSync(webtoonFile);
              bot.editMessageText(
                `${webtoon.title.slice(0, 10)}... - chapiter ${current}/${total} - ${Math.floor(
                  (current * 100) / total
                )}%`,
                {
                  chat_id: webtoon.chat_id,
                  message_id: rapport.message_id,
                }
              );
              current++;
            });
          if (i === webtoon.episodes.length - 1) {
            bot.sendMessage(process.env.CHANNEL_ID, '🔚');
            const queue = getQueue();
            queue.shift();
            fs.writeFileSync('temps/queue.json', JSON.stringify(queue));
            fs.writeFileSync('temps/isUploading.json', JSON.stringify([false]));
          }
        })
        .catch(() => {
          current++;
          bot.sendMessage(
            webtoon.chat_id,
            `Error ❗️ ${webtoon.title.slice(0, 10)}... - chapiter ${current}`
          );
          if (i === webtoon.episodes.length - 1) {
            const queue = getQueue();
            queue.shift();
            fs.writeFileSync('temps/queue.json', JSON.stringify(queue));
            fs.writeFileSync('temps/isUploading.json', JSON.stringify([false]));
          }
        });
    }, i * 4000);
  });
};

const addToQueue = async (msg) => {
  const fileName = msg.document.file_name;

  if (!isAcceptedExtension(fileName)) {
    bot.sendMessage(msg.chat.id, 'File type no accepted❗️');
    return 0;
  }
  const liteFile = await fetch.downloadLiteFile(bot, msg);
  const data = await getDataAndClean(liteFile);
  const webtoon = await structureData(data);

  webtoon.chat_id = msg.chat.id;

  const queue = await getQueue();

  queue.push(webtoon);

  fs.writeFileSync('temps/queue.json', JSON.stringify(queue));
};

bot.on('document', async (msg) => {
  addToQueue(msg).catch((err) => {
    console.log(err);
    bot.sendMessage(msg.chat.id, 'Error ❗️');
  });
});

setInterval(() => {
  if (!isUploading() && getQueue().length) {
    fs.writeFileSync('temps/isUploading.json', JSON.stringify([true]));
    upload(getQueue()[0]).catch((err) => console.log(err));
  }
}, 2000);
