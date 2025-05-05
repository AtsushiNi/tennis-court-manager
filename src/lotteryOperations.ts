import { chromium } from 'playwright';
import { LotteryInfo } from "./fileIO";
import { login, navigateToLotteryPage, registerFavoriteCourt, selectLotteryCell, confirmLottery } from './browserOperations';

// 抽選申込みを実行する一連のブラウザ操作
export async function lottery(log: (msg: string) => string, lotteryInfo: LotteryInfo) {
  const { lotteryNo, userName, userId: userNumber, password, courtType, courtName, month, date, startHour } = lotteryInfo;

  let browser;
  try {
    // ブラウザを起動
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('dialog', async (dialog: import('playwright').Dialog) => {
      await dialog.accept();
    });

    // ログイン処理
    const isSuccessLogin = await login(page, log, userNumber, password);
    if (!isSuccessLogin) {
      log(`Warning: ログインに失敗しました. #${lotteryNo}, 氏名: ${userName}, 利用者番号: ${userNumber}`)
      console.log(`Warning: ログインに失敗しました. #${lotteryNo}, 氏名: ${userName}, 利用者番号: ${userNumber}`)
      return;
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

    // 抽選申込みする枠を選択
    await selectLotteryCell(page, log, date, startHour);
    await page.getByRole('button', { name: ' 申込み' }).click();

    // 申込みを確定
    const remainNumber = await confirmLottery(page, log, userName);

    // 2枠目の抽選申込み枠があれば、もう一度申込む
    if (remainNumber) {
      await page.getByRole('button', { name: '続けて申込み'}).click();

      // 抽選申込みする枠を選択
      await selectLotteryCell(page, log, date, startHour);
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