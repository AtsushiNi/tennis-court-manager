const { chromium } = require('playwright');

(async () => {
  // ブラウザを起動
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const targetCourtType = 'テニス（人工芝）'
  const targetCourtName = '木場公園'
  const targetDate = 17
  const userNumber = 10023779
  const password = 'atsushi@0731'

  // コートタイプのバリデーション
  const validCourtTypes = ['テニス（人工芝）', 'テニス（ハード）'];
  if (!validCourtTypes.includes(targetCourtType)) {
    console.error('エラー: 無効なコートタイプです。許可される値:');
    validCourtTypes.forEach(type => console.error(`- ${type}`));
    process.exit(1);
  }

  try {
    // ログイン処理
    await login(page, userNumber, password);

    // 抽選申込みページへ遷移
    await navigateToLotteryPage(page);

    // 予約するコートを選択
    await page.waitForLoadState('networkidle')
    const favoriteCourtButton = await page.getByRole('button', { name: targetCourtName }).isVisible();
    if (favoriteCourtButton) {
      // 予約対象のコートを選択
      await page.getByRole('button', { name: targetCourtName }).click();
      console.log(`${targetCourtName}を選択`);
    } else {
      // お気に入りコート登録処理
      await registerFavoriteCourt(page, targetCourtName, targetCourtType);

      // 抽選申込みページへ遷移
      await navigateToLotteryPage(page);

      // 予約対象のコートを選択
      await page.getByRole('button', { name: targetCourtName }).click();
      console.log(`${targetCourtName}を選択`);
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
      await page.waitForSelector('#usedate-loading', { state: 'hidden', timeout: 30000 }),
      console.log('翌週ボタンをクリック');
    }

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    // ブラウザを閉じる
    // await browser.close();
  }
})();

// システムにログインする
async function login(page, userNumber, password) {
  // テニスコート予約サイトにアクセス（タイムアウト60秒、DOMContentLoadedまで待機）
  await page.goto('https://kouen.sports.metro.tokyo.lg.jp/web/', {
    timeout: 60000,
    waitUntil: 'domcontentloaded'
  });
  console.log('予約サイトにアクセスしました');

  // ログインボタンをクリック
  await page.getByRole('button', { name: ' ログイン' }).click();
  console.log('ログインボタンをクリック');

  // 利用者番号を入力
  await page.getByRole('textbox', { name: '利用者番号' }).fill(String(userNumber));
  console.log('利用者番号を入力');

  // パスワードを入力
  await page.getByRole('textbox', { name: 'パスワード' }).fill(password);
  console.log('パスワードを入力');

  // ログインボタンをクリック
  await page.getByRole('button', { name: ' ログイン' }).click();
  console.log('ログインを実行');

  console.log();
}

// お気に入りコートを登録する
async function registerFavoriteCourt(page, courtName, courtType) {
  // 抽選メニューをクリック
  console.log('お気に入り登録が見つかりませんでした')
  await page.getByRole('link', { name: '抽選 ⏷' }).click();
  console.log('抽選メニューをクリック');

  // 抽選申込みお気に入り登録をクリック
  await page.getByRole('link', { name: '抽選申込みお気に入り登録' }).click();
  console.log('抽選申込みお気に入り登録をクリック');

  // 登録名を入力
  await page.getByRole('textbox', { name: 'お気に入り名 必須' }).fill(courtName);
  console.log('お気に入り名を入力');

  // 分類を選択
  await page.getByLabel('分類必須').selectOption([courtType]);
  console.log('分類を選択');

  // 公園を選択
  await page.getByLabel('公園必須').selectOption([courtName]);
  console.log('公園を選択');

  // 施設を選択
  const facilitySelect = page.getByLabel('施設必須');
  await facilitySelect.selectOption({ index: 1 });
  const selectedFacility = await facilitySelect.evaluate(select => select.options[select.selectedIndex].textContent.trim());
  console.log(`施設を選択: ${selectedFacility}`);

  // 設定ボタンをクリック
  await page.getByRole('button', { name: ' 設定' }).click();
  console.log('設定ボタンをクリック');

  console.log();
}

// 抽選申込みページへ遷移する
async function navigateToLotteryPage(page) {
  // 抽選メニューをクリック
  await page.getByRole('link', { name: '抽選 ⏷' }).click();
  console.log('抽選メニューをクリック');

  // 抽選申込みリンクをクリック
  await page.getByRole('link', { name: '抽選申込み', exact: true }).click();
  console.log('抽選申込みをクリック');

  console.log();
}
