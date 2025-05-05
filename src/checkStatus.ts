import { chromium } from 'playwright';
import { readMembers, User, initLogFile, appendLog, saveUserStatus } from "./fileIO";
import { getLotteryStatus, login, logout } from './browserOperations';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

export interface UserStatus {
  id: number;
  name: string;
  password: string;
  loginStatus: string;
  lottery1: string;
  lottery2: string;
}

// ブラウザ操作を並行実行する数
const maxConcurrency = 10;

// 全ユーザーの抽選申込み・抽選結果・予約状況を確認する
(async () => {
  // members.csvからユーザーリストを読み込む
  const users = await readMembers();

  const usersStatus: UserStatus[] = users.map(user => ({
    id: user.id,
    name: user.name,
    password: user.password,
    loginStatus: '',
    lottery1: '',
    lottery2: ''
  }));

  // usersを並行実行数で振り分け
  let usersGroup: User[][] = Array.from({length: maxConcurrency}, () => []);
  users.forEach((user, i) => {
    const groupIndex = i % maxConcurrency;
    usersGroup[groupIndex].push(user);
  });

  // 確認処理を並行実行
  await Promise.all(usersGroup.map(async (users: User[], index: number) => {

    // ログ出力用関数
    const logFileName = `checkStatus_${index}.log`;
    const logFilePath = initLogFile(logFileName);
    const log = (message: string) => appendLog(logFilePath, message);

    // ブラウザを操作し確認処理を実行する
    await check(users, usersStatus, log);
  }));

  // エラーが原因で処理を完了できなかったデータに関して再度確認
  console.log('エラーになったユーザーに関して、再度確認処理を実行します')
  const errorUserIds = usersStatus.filter(userStatus => userStatus.loginStatus === '').map(userStatus => userStatus.id);
  const errorUsers = users.filter(user => errorUserIds.includes(user.id));
  const logFilePath = initLogFile('checkStatus_redo.log');
  const log = (message: string) => appendLog(logFilePath, message);
  // ブラウザを操作し確認処理を実行する
  await check(errorUsers, usersStatus, log);

  // 全ユーザーの処理が終了したら一括でCSVに書き出す
  await saveUserStatus(usersStatus);

})();

// ブラウザを操作しusersそれぞれについて確認し、usersStatusを更新する
async function check(users: User[], usersStatus: UserStatus[], log: (msg: string) => void): Promise<void> {
  // ブラウザを起動
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('dialog', async (dialog: import('playwright').Dialog) => {
    await dialog.accept();
  });

  for (const user of users) {
    log('')
    log(`=== 処理開始 ===`);
    log(`利用者: ${user.name} (利用者番号: ${user.id})`)

    try {
      const userStatus = usersStatus.find(u => u.id === user.id);
      if (!userStatus) { continue; }

      // ログイン処理
      const isSuccessLogin = await login(page, log, user.id, user.password);
      if (!isSuccessLogin) {
        log(`Warning: ログインに失敗しました. 氏名: ${user.name}, 利用者番号: ${user.id}`);
        console.log(`Warning: ログインに失敗しました. 氏名: ${user.name}, 利用者番号: ${user.id}`);

        userStatus.loginStatus = 'x';
        continue;
      }
      userStatus.loginStatus = 'o';

      // 抽選申込み状況を確認
      log('抽選申込み状況を確認')
      const lotteryStatus = await getLotteryStatus(page);
      userStatus.lottery1 = lotteryStatus[0] || '-';
      userStatus.lottery2 = lotteryStatus[1] || '-';

      // ログアウト
      await logout(page, log);
    } catch (error) {
      console.error(`ブラウザ起動中にエラーが発生しました: `, error);
      log(`ブラウザ起動中にエラーが発生しました: ${error}`);
    }
  }
  if (browser) {
    // ブラウザを閉じる
    await browser.close();
  }
}
