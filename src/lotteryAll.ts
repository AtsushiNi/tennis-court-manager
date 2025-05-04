import { LotteryInfo, readLotterySetting, readMembers, saveLotteryInfo, initLogFile, appendLog } from './fileIO';
import { lottery } from './lotteryOperations';

(async () => {
  // lotterySetting.jsonから抽選設定を読み込む
  const lotterySetting = readLotterySetting();
  const targets = lotterySetting.targets;

  // members.csvからユーザーリストを読み込む
  const users = await readMembers();

  // ユーザーを予約コート・日時で均等に振り分ける
  let lotteryInfoGroup: LotteryInfo[][] = Array.from({length: targets.length}, () => []);
  users.forEach((user, i) => {
    const targetIndex = i % targets.length;
    const target = targets[targetIndex];
    
    const lotteryInfo: LotteryInfo = {
      lotteryNo: i+1,
      userName: user.name,
      userId: user.id,
      password: user.password,
      month: lotterySetting.month,
      ...target
    };
    
    lotteryInfoGroup[targetIndex].push(lotteryInfo);
  });

  // 抽選情報をlotteryInfo.csvに保存
  saveLotteryInfo(lotteryInfoGroup.flat());

  // 各予約コート・日時ごとに抽選を並行処理
  await Promise.all(lotteryInfoGroup.map(async (lotteryInfoList: LotteryInfo[], index: number) => {
    // ログファイルを初期化
    const { month, date, startHour, courtName, courtType } = lotteryInfoList[0]; // これらの情報はlistの全てで同じなので、先頭のデータで代表
    const logFileName = `${index}_${month}-${date}${courtName.replace(/\s+/g, '_')}_${startHour}.log`;
    const logFilePath = initLogFile(logFileName);

    // ログ出力用関数
    const log = (message: string) => appendLog(logFilePath, message);
    
    log(`=== 処理開始 ===`);
    log(`対象コート: ${courtName} (${courtType})`);
    log(`対象日: ${month}月${date}日`);
    log(`対象時間: ${startHour}:00~`);

    // コートタイプのバリデーション
    const validCourtTypes = ['テニス（人工芝）', 'テニス（ハード）'];
    if (!validCourtTypes.includes(courtType)) {
      log('');
      log('エラー: 無効なコートタイプです。許可される値:');
      log('');
      validCourtTypes.forEach(type => log(`- ${type}`));
      return;
    }

    // リスト内の抽選申込みを1件ずつ処理
    for (const lotteryInfo of lotteryInfoList) {
      const { lotteryNo, userName, userId } = lotteryInfo;

      log('');
      log(`=== 処理開始: #${lotteryNo} ${userName} (利用者番号: ${userId}) ===`);
      console.log(`=== 処理開始: #${lotteryNo} ${userName} (利用者番号: ${userId}) ===`);

      // 抽選申込み
      await lottery(log, lotteryInfo);
    }
  }));
})();
