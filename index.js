const { chromium } = require('playwright');
const fileIO = require('./fileIO');

(async () => {
  // lotterySetting.jsonから抽選設定を読み込む
  const lotterySetting = fileIO.readLotterySetting();
  const targets = lotterySetting.targets;

  // members.csvからユーザーリストを読み込む
  const users = await fileIO.readMembers();

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
  fileIO.saveLotteryInfo(lotterySetting);

  // 各予約コート・日時ごとに抽選を並行処理
  await Promise.all(targets.map(async (target, index) => {
    const targetCourtType = target.courtType;
    const targetCourtName = target.courtName;
    const targetDate = target.date;
    const targetStartHour = target.startHour;

    // ログファイルを初期化
    const logFileName = fileIO.initLogFile(index, lotterySetting.month, targetDate, targetCourtName, targetStartHour);

    // ログ出力用関数 (ターゲット単位)
    const log = (message) => fileIO.appendLog(logFileName, message);
    
    log(`=== 処理開始 ===`);
    log(`対象コート: ${targetCourtName} (${targetCourtType})`);
    log(`対象日: ${lotterySetting.month}月${targetDate}日`);
    log(`対象時間: ${targetStartHour}:00~`);
    log('');

    // コートタイプのバリデーション
    const validCourtTypes = ['テニス（人工芝）', 'テニス（ハード）'];
    if (!validCourtTypes.includes(targetCourtType)) {
      log('エラー: 無効なコートタイプです。許可される値:');
      validCourtTypes.forEach(type => log(`- ${type}`));
      await browser.close();
      return;
    }

    // グループ内のユーザーを処理
    for (const user of target.users) {
      const lotteryNo = user.lotteryNo;
      const userName = user.name;
      const userNumber = user.id;
      const password = user.password;

      log(`=== 処理開始: #${lotteryNo} ${userName} (利用者番号: ${userNumber}) ===`);
      console.log(`=== 処理開始: #${lotteryNo} ${userName} (利用者番号: ${userNumber}) ===`);

      // ブラウザを起動
      const browser = await chromium.launch({ headless: false });
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // ログイン処理
        await login(page, log, userNumber, password);

        // 抽選申込みページへ遷移
        await navigateToLotteryPage(page, log);

        // 予約するコートを選択
        await page.waitForLoadState('networkidle')
        const favoriteCourtButton = await page.getByRole('button', { name: targetCourtName }).isVisible();
        if (favoriteCourtButton) {
          // 予約対象のコートを選択
          await page.getByRole('button', { name: targetCourtName }).click();
          log(`${targetCourtName}を選択`);
        } else {
          // お気に入りコート登録処理
          await registerFavoriteCourt(page, log, targetCourtName, targetCourtType);

          // 抽選申込みページへ遷移
          await navigateToLotteryPage(page, log);

          // 予約対象のコートを選択
          await page.getByRole('button', { name: targetCourtName }).click();
          log(`${targetCourtName}を選択`);
        }

        // 対象日が表示されるまで翌週ボタンをクリック
        while (!(await page.locator('th[id^="usedate-theader-"]').filter({
          hasText: targetDate + '日'
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
        // ブラウザを閉じる
        await browser.close();
      }
    }
  }));
})();

// システムにログインする
async function login(page, log, userNumber, password) {
  // テニスコート予約サイトにアクセス（タイムアウト60秒、DOMContentLoadedまで待機）
  await page.goto('https://kouen.sports.metro.tokyo.lg.jp/web/', {
    timeout: 60000,
    waitUntil: 'domcontentloaded'
  });
  log('予約サイトにアクセスしました');

  // ログインボタンをクリック
  await page.getByRole('button', { name: ' ログイン' }).click();
  log('ログインボタンをクリック');

  // 利用者番号を入力
  await page.getByRole('textbox', { name: '利用者番号' }).fill(String(userNumber));
  log('利用者番号を入力');

  // パスワードを入力
  await page.getByRole('textbox', { name: 'パスワード' }).fill(password);
  log('パスワードを入力');

  // ログインボタンをクリック
  await page.getByRole('button', { name: ' ログイン' }).click();
  log('ログインを実行');

  log('');
}

// お気に入りコートを登録する
async function registerFavoriteCourt(page, log, courtName, courtType) {
  // 抽選メニューをクリック
  log('お気に入り登録が見つかりませんでした')
  await page.getByRole('link', { name: '抽選 ⏷' }).click();
  log('抽選メニューをクリック');

  // 抽選申込みお気に入り登録をクリック
  await page.getByRole('link', { name: '抽選申込みお気に入り登録' }).click();
  await page.waitForLoadState('networkidle')
  log('抽選申込みお気に入り登録をクリック');

  // 登録名を入力
  await page.getByRole('textbox', { name: 'お気に入り名 必須' }).fill(courtName);
  log('お気に入り名を入力');

  // 分類を選択
  await page.getByLabel('分類必須').selectOption([courtType]);
  log('分類を選択');

  // 公園を選択
  await page.getByLabel('公園必須').selectOption([courtName]);
  log('公園を選択');

  // 施設を選択
  const facilitySelect = page.getByLabel('施設必須');
  await facilitySelect.selectOption({ index: 1 });
  const selectedFacility = await facilitySelect.evaluate(select => select.options[select.selectedIndex].textContent.trim());
  log(`施設を選択: ${selectedFacility}`);

  // 設定ボタンをクリック
  await page.getByRole('button', { name: ' 設定' }).click();
  log('設定ボタンをクリック');

  log('');
}

// 抽選申込みページへ遷移する
async function navigateToLotteryPage(page, log) {
  // 抽選メニューをクリック
  await page.getByRole('link', { name: '抽選 ⏷' }).click();
  log('抽選メニューをクリック');

  // 抽選申込みリンクをクリック
  await page.getByRole('link', { name: '抽選申込み', exact: true }).click();
  log('抽選申込みをクリック');

  log('');
}
