/**
 * 数字を全角に変換する
 * @param {number|string} num - 変換する数字（数値または文字列）
 * @returns {string} 全角数字の文字列
 */
function toFullWidthNumber(num) {
  const halfToFullMap = {
    '0': '０',
    '1': '１',
    '2': '２',
    '3': '３',
    '4': '４',
    '5': '５',
    '6': '６',
    '7': '７',
    '8': '８',
    '9': '９'
  };
  
  return String(num).replace(/[0-9]/g, match => halfToFullMap[match]);
}

module.exports = {
  toFullWidthNumber
};
