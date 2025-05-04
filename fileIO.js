const fs = require('fs');
const csv = require('csv-parser');

const logDir = 'logs';

// lotterySetting.jsonからターゲット情報を読み込む
function readLotterySetting() {
  console.log('lotterySetting.jsonから抽選ターゲット情報を読み込みます');

  return JSON.parse(fs.readFileSync('lotterySetting.json', 'utf8'));
}

// members.csvからユーザーリストを読み込む
async function readMembers() {
  console.log('members.csvからユーザーリストを読み込みます');

  const users = [];
  let sequenceNumber = 1;
  await new Promise((resolve, reject) => {
    fs.createReadStream('members.csv')
      .pipe(csv())
      .on('data', (row) => {
        users.push({
          lotteryNo: sequenceNumber++,
          id: row.ID,
          password: row.PW,
          name: row.名前
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });
  return users;
}

// 抽選情報をlotteryInfo.csvに保存
function saveLotteryInfo(lotterySetting) {
  const fileName = 'lotteryInfo.csv';
  console.log(`${logDir}/${fileName}に抽選情報を出力します`);

  fs.mkdirSync(logDir, { recursive: true });
  const csvWriter = fs.createWriteStream(`${logDir}/${fileName}`);
  csvWriter.write('抽選番号,利用者氏名,利用者ID,利用者パスワード,コートタイプ,コート名,抽選月,対象日付,開始時間\n');
  
  lotterySetting.targets.forEach(target => {
    target.users.forEach(user => {
      csvWriter.write(
        `${user.lotteryNo},${user.name},${user.id},${user.password},` +
        `${target.courtType},${target.courtName},${lotterySetting.month},${target.date},${target.startHour}\n`
      );
    });
  });
  csvWriter.end();
}

// 抽選情報をlotteryInfo.csvから読み込み
async function readLotteryInfo() {
  const fileName = 'lotteryInfo.csv';
  console.log(`${logDir}/${fileName}から抽選情報を読み込みます`);

  const results = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(`${logDir}/${fileName}`)
      .pipe(csv())
      .on('data', (row) => {
        results.push({
          lotteryNo: parseInt(row['抽選番号']),
          name: row['利用者氏名'],
          id: row['利用者ID'],
          password: row['利用者パスワード'],
          courtType: row['コートタイプ'],
          courtName: row['コート名'],
          month: row['抽選月'],
          date: row['対象日付'],
          startHour: row['開始時間']
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });
  return results;
}

// ログファイルを初期化
function initLogFile(logFileName) {
  const logFilePath = `${logDir}/${logFileName}`
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(logFilePath, ''); // 空ファイルを作成
  return logFilePath;
}

// ログにメッセージを追加
function appendLog(logFileName, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  fs.appendFileSync(logFileName, `${logMessage}\n`);
  return logMessage;
}

module.exports = {
  readLotterySetting,
  readMembers,
  saveLotteryInfo,
  readLotteryInfo,
  initLogFile,
  appendLog
};
