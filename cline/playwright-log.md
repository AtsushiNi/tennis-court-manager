# 抽選結果確認のログ
```
// Navigate to https://kouen.sports.metro.tokyo.lg.jp/web/index.jsp
await page.goto('https://kouen.sports.metro.tokyo.lg.jp/web/index.jsp');

// Click ログインボタン
await page.getByRole('button', { name: ' ログイン' }).click();

// Fill "10202594" into "利用者番号入力欄"
await page.getByRole('textbox', { name: '利用者番号' }).fill('10202594');

// Fill "niihama@123" into "パスワード入力欄"
await page.getByRole('textbox', { name: 'パスワード' }).fill('niihama@123');

// Click ログインボタン
await page.getByRole('button', { name: ' ログイン' }).click();

// Click 抽選ボタン
await page.getByRole('link', { name: '抽選 ⏷' }).click();

// Click 抽選結果ボタン
await page.getByRole('link', { name: '抽選結果' }).click();
```
