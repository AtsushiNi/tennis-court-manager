import { chromium } from 'playwright';
import { login, registerFavoriteCourt, navigateToLotteryPage, selectLotteryCell, confirmLottery } from './browserOperations';
import { Target, readLotterySetting, readMembers, saveLotteryInfo, initLogFile, appendLog } from './fileIO';

(async () => {
  // lotterySetting.jsonから抽選設定を読み込む
  const lotterySetting = readLotterySetting();
  const targets = lotterySetting.targets;

  // members.csvからユーザーリストを読み込む
  const users = await readMembers();

  // ユーザーを予約コート・日時で振り分ける
  const baseSize = Math.floor(users.length / targets.length);
  const remainder = users.length % targets.length;
  let start = 0;
  for (let i = 0; i < targets.length; i++) {
    const end = start + baseSize + (i < remainder ? 1 : 0);
    targets[i].users = users.slice(start, end);
    start = end;
  }

  // 抽選情報をlotteryInfo.csvに保存
  saveLotteryInfo(lotterySetting);

  // 各予約コート・日時ごとに抽選を並行処理
  await Promise.all(targets.map(async (target: Target, index: number) => {
    const targetCourtType = target.courtType;
    const targetCourtName = target.courtName;
    const targetDate = target.date;
    const targetStartHour = target.startHour;

    // ログファイルを初期化
    const logFileName = `${index}_${lotterySetting.month}-${targetDate}${targetCourtName.replace(/\s+/g, '_')}_${targetStartHour}.log`;
    const logFilePath = initLogFile(logFileName);

    // ログ出力用関数 (ターゲット単位)
    const log = (message: string) => appendLog(logFilePath, message);
    
    log(`=== 処理開始 ===`);
    log(`対象コート: ${targetCourtName} (${targetCourtType})`);
    log(`対象日: ${lotterySetting.month}月${targetDate}日`);
    log(`対象時間: ${targetStartHour}:00~`);

    // コートタイプのバリデーション
    const validCourtTypes = ['テニス（人工芝）', 'テニス（ハード）'];
    if (!validCourtTypes.includes(targetCourtType)) {
      log('');
      log('エラー: 無効なコートタイプです。許可される値:');
      log('');
      validCourtTypes.forEach(type => log(`- ${type}`));
      return;
    }

    // グループ内のユーザーを処理
    for (const user of target.users) {
      const lotteryNo: number = user.lotteryNo;
      const userName = user.name;
      const userNumber = user.id;
      const password = user.password;

      log('');
      log(`=== 処理開始: #${lotteryNo.toString()} ${userName} (利用者番号: ${userNumber}) ===`);
      console.log(`=== 処理開始: #${lotteryNo.toString()} ${userName} (利用者番号: ${userNumber}) ===`);

      // ブラウザを起動
      let browser;
      try {
        browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();
        page.on('dialog', async (dialog: import('playwright').Dialog) => {
          await dialog.accept();
        });

        // ログイン処理
        const isSuccessLogin = await login(page, log, Number(userNumber), password);
        if (!isSuccessLogin) {
          log(`Warning: ログインに失敗しました. #${lotteryNo.toString()}, 氏名: ${userName}, 利用者番号: ${userNumber}`)
          console.log(`Warning: ログインに失敗しました. #${lotteryNo.toString()}, 氏名: ${userName}, 利用者番号: ${userNumber}`)
          continue;
        }

        // 抽選申込みページへ遷移
        await navigateToLotteryPage(page, log);

        // お気に入りコートに未登録なら登録する
        await page.waitForLoadState('networkidle');
        const favoriteCourtButton = await page.getByRole('button', { name: targetCourtName }).isVisible();
        if (!favoriteCourtButton) {
          // お気に入りコート登録処理
          await registerFavoriteCourt(page, log, targetCourtName, targetCourtType);
          // 抽選申込みページへ遷移
          await navigateToLotteryPage(page, log);
        }

        // 予約対象のコートを選択
        await page.getByRole('button', { name: targetCourtName }).click();
        log(`${targetCourtName}を選択`);

        // 抽選申込みする枠を選択
        await selectLotteryCell(page, log, targetDate, Number(targetStartHour));
        await page.getByRole('button', { name: ' 申込み' }).click();

        // 申込みを確定
        const remainNumber = await confirmLottery(page, log, userName);

        // 2枠目の抽選申込み枠があれば、もう一度申込む
        if (remainNumber) {
          await page.getByRole('button', { name: '続けて申込み'}).click();

          // 抽選申込みする枠を選択
          await selectLotteryCell(page, log, targetDate, Number(targetStartHour));
          await page.getByRole('button', { name: ' 申込み' }).click();

          // 申込みを確定
          await confirmLottery(page, log, userName);
        }
      } catch (error) {
        log(`ブラウザ起動中にエラーが発生しました: ${error}`);
        console.error(`ブラウザ起動中にエラーが発生しました: `, error);
      } finally {
        if (browser) {
          // ブラウザを閉じる
          await browser.close();
        }
      }
    }
  }));
})();
