const fs = require('fs');

const SEPARATOR = '%%%-%%%';
const ACCEPTED_FILE_EXTENSION = ['pipi'];

/**
 *
 * @param {string} filename
 * @returns string
 */
const getExtension = (filename) => filename.split('.').pop();

/**
 *
 * @param {string} filename
 * @returns boolean
 */
const isAcceptedExtension = (filename) =>
  ACCEPTED_FILE_EXTENSION.includes(getExtension(filename));

/**
 *
 * @param {string} path
 * @returns Promise<string>
 */
const getDataAndClean = (path) => {
  return new Promise((resolve, reject) => {
    try {
      const data = fs.readFileSync(path, 'utf8');
      fs.rmSync(path);
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 *
 * @param {string} data
 * @returns  webtoon[]
 */
const structureData = async (data) => {
  const webtoon = { episodes: [] };
  data.split(/\r?\n/).forEach((line, i) => {
    if (i === 0) {
      const lineContent = line.split(SEPARATOR);
      webtoon.title = lineContent[0] ? lineContent[0] : '?';
      webtoon.synopsis = lineContent[1] ? lineContent[1] : '?';
      lineContent.forEach((content) => {
        if (content.search('http') !== -1) webtoon.img = content;
      });
    } else {
      const lineContent = line.split(SEPARATOR);
      if (lineContent[1]) webtoon.episodes.push({ number: i, url: lineContent[1] });
    }
  });
  return webtoon;
};

/**
 * EXPORTS
 */
module.exports.getExtension = getExtension;
module.exports.isAcceptedExtension = isAcceptedExtension;
module.exports.structureData = structureData;
module.exports.getDataAndClean = getDataAndClean;
