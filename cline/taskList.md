
1. 以下と同等の操作をplaywright mcpサーバーで実行
    await page.goto('https://kouen.sports.metro.tokyo.lg.jp/web/', {
      timeout: 60000,
      waitUntil: 'domcontentloaded'
    });
    console.log('予約サイトにアクセスしました');

    // ログインボタンをクリック
    await page.getByRole('button', { name: ' ログイン' }).click();
    console.log('ログインボタンをクリック');

    // 利用者番号を入力
    await page.getByRole('textbox', { name: '利用者番号' }).fill('10023779');
    console.log('利用者番号を入力');

    // パスワードを入力
    await page.getByRole('textbox', { name: 'パスワード' }).fill('atsushi@0731');
    console.log('パスワードを入力');

    // ログインボタンをクリック
    await page.getByRole('button', { name: ' ログイン' }).click();
    console.log('ログインを実行');
1. "抽選"をクリックし、"抽選申込みお気に入り登録"をクリック
1. お気に入り名に"木場公園"を入力
1. 分類に"テニス（人工芝）"を選択
1. 公園に"木場公園"を選択
1. 施設オプションで2つ目の選択肢を選択
1. "設定"をクリック