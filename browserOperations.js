const { chromium } = require('playwright');

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

module.exports = {
  login,
  registerFavoriteCourt,
  navigateToLotteryPage
};
