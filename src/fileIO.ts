import fs from 'fs';
import csv from 'csv-parser';

const logDir = 'logs';

export interface MemberRow {
  ID: string;
  PW: string;
  名前: string;
}

export interface LotteryInfoRow {
  抽選番号: string;
  利用者氏名: string;
  利用者ID: string;
  利用者パスワード: string;
  コートタイプ: string;
  コート名: string;
  抽選月: string;
  対象日付: string;
  開始時間: string;
}

export interface User {
  lotteryNo: number;
  id: string;
  password: string;
  name: string;
}

export interface Target {
  courtType: string;
  courtName: string;
  date: string;
  startHour: string;
  users: User[];
}

export interface LotterySetting {
  month: string;
  targets: Target[];
}

export interface LotteryResult {
  lotteryNo: number;
  name: string;
  id: string;
  password: string;
  courtType: string;
  courtName: string;
  month: string;
  date: string;
  startHour: string;
}

// lotterySetting.jsonからターゲット情報を読み込む
export function readLotterySetting(): LotterySetting {
  console.log('lotterySetting.jsonから抽選ターゲット情報を読み込みます');

  const data = JSON.parse(fs.readFileSync('input/lotterySetting.json', 'utf8'));
  // lotteryNoをnumber型に変換
  data.targets.forEach((target: any) => {
    if (target.users) {
      target.users.forEach((user: any) => {
        if (typeof user.lotteryNo === 'string') {
          user.lotteryNo = parseInt(user.lotteryNo);
        }
      });
    }
  });
  return data;
}

// members.csvからユーザーリストを読み込む
export async function readMembers(): Promise<User[]> {
  console.log('members.csvからユーザーリストを読み込みます');

  const users: User[] = [];
  let sequenceNumber = 1;
  await new Promise((resolve, reject) => {
    fs.createReadStream('input/members.csv')
      .pipe(csv())
      .on('data', (row: MemberRow) => {
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
export function saveLotteryInfo(lotterySetting: LotterySetting): void {
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
export async function readLotteryInfo(): Promise<LotteryResult[]> {
  const fileName = 'lotteryInfo.csv';
  console.log(`${logDir}/${fileName}から抽選情報を読み込みます`);

  const results: LotteryResult[] = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(`${logDir}/${fileName}`)
      .pipe(csv())
      .on('data', (row: LotteryInfoRow) => {
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
export function initLogFile(logFileName: string): string {
  const logFilePath = `${logDir}/${logFileName}`
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(logFilePath, ''); // 空ファイルを作成
  return logFilePath;
}

// ログにメッセージを追加
export function appendLog(logFileName: string, message: string): string {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  fs.appendFileSync(logFileName, `${logMessage}\n`);
  return logMessage;
}
