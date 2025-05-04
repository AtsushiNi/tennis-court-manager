const { chromium } = require('playwright');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});
const fileIO = require('./fileIO');
const { login, registerFavoriteCourt, navigateToLotteryPage } = require('./browserOperations');

(async () => {
  // 抽選情報をlotteryInfo.csvから読み込み
  const lotteryInfo = await fileIO.readLotteryInfo();

  // 抽選番号の範囲を標準入力から取得
  const [start, end] = await new Promise((resolve) => {
    readline.question('実行したい抽選番号の開始値と終了値をスペース区切りで入力してください (例: 10 20): ', (input) => {
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
  const logFilePath = fileIO.initLogFile(logFileName);
  const log = (message) => fileIO.appendLog(logFilePath, message);

  // 抽出した抽選情報を処理
  for (const info of filteredInfo) {
    const lotteryNo = info.lotteryNo;
    const userName = info.name;
    const userNumber = info.id;
    const password = info.password;
    const courtName = info.courtName;
    const courtType = info.courtType;
    const date = info.date;
    const startHour = info.startHour;

    log('')
    log(`=== 処理開始: #${lotteryNo} ===`);
    log(`利用者: ${userName} (利用者番号: ${userNumber})`)
    log(`コート名: ${courtName}, 日時: ${info.month}/${date} ${startHour}:00~`)
    log('')
    console.log(`=== 処理開始: #${lotteryNo} ${userName} (利用者番号: ${userNumber}) ===`);

    // ブラウザを起動
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // ログイン処理
      const isSuccessLogin = await login(page, log, userNumber, password);
      if (!isSuccessLogin) {
        log(`Warning: ログインに失敗しました. #${lotteryNo}, 氏名: ${userName}, 利用者番号: ${userNumber}`)
        console.log(`Warning: ログインに失敗しました. #${lotteryNo}, 氏名: ${userName}, 利用者番号: ${userNumber}`)
        continue;
      }

      // 抽選申込みページへ遷移
      await navigateToLotteryPage(page, log);

      // お気に入りコートに未登録なら登録する
      await page.waitForLoadState('networkidle');
      const favoriteCourtButton = await page.getByRole('button', { name: courtName }).isVisible();
      if (!favoriteCourtButton) {
        // お気に入りコート登録処理
        await registerFavoriteCourt(page, log, courtName, courtType);
        // 抽選申込みページへ遷移
        await navigateToLotteryPage(page, log);
      }

      // 予約対象のコートを選択
      await page.getByRole('button', { name: courtName }).click();
      log(`${courtName}を選択`);

      // 対象日が表示されるまで翌週ボタンをクリック
      while (!(await page.locator('th[id^="usedate-theader-"]').filter({
        hasText: date + '日'
      }).count())) {
        await Promise.all([
          page.waitForSelector('#usedate-loading', { state: 'hidden', timeout: 30000 }),
          page.waitForLoadState('networkidle')
        ]);
        
        await page.getByRole('button', { name: '翌週' }).click({ force: true });
        await page.waitForSelector('#usedate-loading', { state: 'hidden', timeout: 30000 });
        log('翌週ボタンをクリック');
      }

    } catch (error) {
      log(`エラーが発生しました: ${error}`);
      console.error(`エラーが発生しました: `, error);
    } finally {
      await browser.close();
    }
  }
})();
