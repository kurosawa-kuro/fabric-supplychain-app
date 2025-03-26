'use strict';

const crypto = require('crypto');

/**
 * 寸法などオブジェクトのハッシュを安定化（キー順でソート）して作成
 * @param {object} data
 * @returns {string} sha256ハッシュ文字列
 */
function createHashBySortedKeys(data) {
  const sortedData = Object.keys(data)
    .sort()
    .reduce((obj, key) => {
      obj[key] = data[key];
      return obj;
    }, {});
  return crypto.createHash('sha256')
    .update(JSON.stringify(sortedData))
    .digest('hex');
}

module.exports = {
  createHashBySortedKeys
};