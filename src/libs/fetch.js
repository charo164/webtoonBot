/* eslint-disable prefer-promise-reject-errors */
const fs = require('fs');
const https = require('https');
const path = require('path');
const file = require('./file_and_data');
const FOLDER = path.join(process.cwd(), 'temps');

const preDownload = () => {
  if (fs.existsSync(FOLDER)) return 1;
  fs.mkdirSync(FOLDER);
};

/**
 *
 * @param {string} fileUrl
 * @param {string} fileName
 * @returns string
 */
const downloader = (fileUrl = '', fileName = '') => {
  return new Promise((resolve, reject) => {
    try {
      preDownload();
      const url = fileUrl.replace(/\?dl=0/g, '?dl=1');
      const ext = file.getExtension(url).split('?')[0];
      const tempPath = path.join(FOLDER, fileName + '.' + ext);
      const dest = fs.createWriteStream(tempPath);
      https
        .get(url, (res) => {
          if (res.statusCode === 200) {
            const stream = res.pipe(dest);
            stream.on('error', (error) => {
              reject(error);
            });
            stream.on('finish', () => {
              resolve(tempPath);
            });
          } else if (res.statusCode === 302) {
            downloader(res.headers.location, fileName)
              .then((r) => {
                resolve(r);
              })
              .catch((e) => {
                reject(e);
              });
          } else {
            setTimeout(() => {
              downloader(res.headers.location, fileName)
                .then((r) => {
                  resolve(r);
                })
                .catch((e) => {
                  reject(e);
                });
            }, 2000);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 *
 * @param {TelegramBot} bot
 * @param {TelegramBot.Message} msg
 * @returns string
 */
const downloadLiteFile = async (bot, msg) => {
  const fileName = msg.document.file_name;
  const filePath = (await bot.getFile(msg.document.file_id)).file_path;
  const fileUrl = process.env.FILE_URL + filePath;
  const res = await downloader(fileUrl, fileName);
  return res;
};

module.exports.downloadLiteFile = downloadLiteFile;
module.exports.downloader = downloader;
