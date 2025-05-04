const { chromium } = require('playwright');
const { toFullWidthNumber } = require('./util');

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

  // ログイン成功可否を確認
  await page.waitForLoadState('networkidle');
  const newsDisplay = await page.getByLabel('お知らせ', { timeout: 5000 });
  if (await newsDisplay.count()) {
    return true;
  } else {
    return false;
  }
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

// テーブルから指定した行と列のテキストに一致するセルを取得する
async function getCell(table, rowText, colText) {
  // テーブル上の対象列のindexを取得
  const headers = await table.locator('thead th');
  const headersCount = await headers.count();
  let colIndex;
  for (let i = 0; i < headersCount; i++) {
    const text = await headers.nth(i).innerText();
    if (text.includes(colText)) {
      colIndex = i;
      break;
    }
  }

  // テーブル上の対象行のindexを取得
  const rows = await table.locator('tbody tr');
  const rowsCount = await rows.count();
  let rowIndex;
  for (let i = 0; i < rowsCount; i++) {
    const th = await rows.nth(i).locator('th');
    const text = await th.innerText();
    if (text.includes(rowText)) {
      rowIndex = i;
      break;
    }
  }

  // 特定したセルのロケーターを返す
  return table.locator(`tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${colIndex + 1})`);
}

// 抽選申込みのコマを選択する
async function selectLotteryCell(page, log, date, startHour) {
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

  // セルを取得
  const cell = await getCell(page.locator('#usedate-table'), toFullWidthNumber(startHour), `${date}日`);

  await cell.click();

  log('抽選コマを選択');
  log('');
}

// 抽選申込みを確定する
async function confirmLottery(page, log, userName) {
  const row = await page.locator('#lottery-confirm > table tbody tr:nth-child(1)');
  const courtName = await row.locator('td:nth-child(2)').evaluate((td) => {
    return td.textContent.replace(td.querySelector('span').textContent, '').trim();
  });
  const date = await row.locator('td:nth-child(4) span:nth-child(2)').evaluate(el => el.textContent.trim());
  const hour = await row.locator('td:nth-child(5)').evaluate((td) => {
    return td.textContent.replace(td.querySelector('span').textContent, '').trim();
  });

  // 申込み枠数を確認する
  const optionNumber = await page.locator('#apply option').count() - 1;

  if (optionNumber == 0) { // 2枠とも申込み済み
    log(`${userName} は残り抽選申込み枠がないため、抽選申込みできません`);
    console.log(`${userName} は残り抽選申込み枠がないため、抽選申込みできません`);
    return 0;
  }

  let remainNumber; // 残り申込み枠数
  if (optionNumber == 2) { // 1枠目で申込み
    log(`${userName} 1枠目で ${courtName} ${date} ${hour} を抽選申込みします`);
    console.log(`${userName} 1枠目で ${courtName} ${date} ${hour} を抽選申込みします`);
    remainNumber = 1;
  } else if(optionNumber == 1) { // 2枠目で申込み
    log(`${userName} 2枠目で ${courtName} ${date} ${hour} を抽選申込みします`);
    console.log(`${userName} 2枠目で ${courtName} ${date} ${hour} を抽選申込みします`);
    remainNumber = 0;
  }

  // 確定
  await page.getByLabel('申込み番号').selectOption({ index: 1 });
  await page.getByRole('button', { name: ' 申込み' }).click();

  return remainNumber;
}

module.exports = {
  login,
  registerFavoriteCourt,
  navigateToLotteryPage,
  selectLotteryCell,
  confirmLottery
};
