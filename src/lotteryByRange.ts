import { createInterface } from 'readline';
const readline = createInterface({
  input: process.stdin,
  output: process.stdout
});
import { LotteryInfo, readLotteryInfo, initLogFile, appendLog } from './fileIO';
import { lottery } from './lotteryOperations';

(async () => {
  // 抽選情報をlotteryInfo.csvから読み込み
  const lotteryInfo: LotteryInfo[] = await readLotteryInfo();

  // 抽選番号の範囲を標準入力から取得
  const [start, end] = await new Promise<number[]>((resolve) => {
    readline.question('実行したい抽選番号の開始値と終了値をスペース区切りで入力してください (例: 10 20): ', (input: string) => {
      const numbers = input.trim().split(' ').map(Number);
      readline.close();
      resolve(numbers);
    });
  });

  if (isNaN(start) || isNaN(end) || start > end) {
    console.error('無効な入力です。開始値と終了値は数値で、開始値 <= 終了値である必要があります。');
    process.exit(1);
  }

  console.log(`抽選番号範囲: ${start} から ${end} までの抽選申込みを実行します`);

  // 指定範囲の抽選情報を抽出
  const filteredInfo = lotteryInfo.filter(info => 
    info.lotteryNo >= start && info.lotteryNo <= end
  );

  // ログファイルを初期化
  const logFileName = `range_lotteryNo-${start}-${end}.log`
  const logFilePath = initLogFile(logFileName);
  const log = (message: string) => appendLog(logFilePath, message);

  // 抽出した抽選情報を1件ずつ処理
  for (const lotteryInfo of filteredInfo) {
    const { lotteryNo, userName, userId, courtName, month, date, startHour } = lotteryInfo;

    log('')
    log(`=== 処理開始: #${lotteryNo} ===`);
    log(`利用者: ${userName} (利用者番号: ${userId})`)
    log(`コート名: ${courtName}, 日時: ${month}/${date} ${startHour}:00~`)
    log('')
    console.log(`=== 処理開始: #${lotteryNo} ${userName} (利用者番号: ${userId}) ===`);

    // 抽選申込み
    await lottery(log, lotteryInfo);
  }
})();
