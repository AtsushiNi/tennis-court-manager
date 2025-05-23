import { Page } from 'playwright'
import { FileConsoleLogger } from './util'

/**
 * システムにログインする
 */
export async function login(
  page: Page,
  logger: FileConsoleLogger,
  userNumber: number,
  password: string
): Promise<boolean> {
  // テニスコート予約サイトにアクセス（タイムアウト60秒、DOMContentLoadedまで待機）
  await page.goto('https://kouen.sports.metro.tokyo.lg.jp/web/', {
    timeout: 60000,
    waitUntil: 'domcontentloaded'
  })
  logger.info('予約サイトにアクセスしました')

  // ログインボタンをクリック
  await page.waitForLoadState('networkidle', { timeout: 60000 })
  await page.waitForSelector('#loadmsg', { state: 'hidden', timeout: 30000 })
  await page.getByRole('button', { name: ' ログイン' }).click()
  logger.info('ログインボタンをクリック')

  // 利用者番号を入力
  await page.getByRole('textbox', { name: '利用者番号' }).fill(String(userNumber))
  logger.info('利用者番号を入力')

  // パスワードを入力
  await page.getByRole('textbox', { name: 'パスワード' }).fill(password)
  logger.info('パスワードを入力')

  // ログインボタンをクリック
  await page.getByRole('button', { name: ' ログイン' }).click()
  logger.info('ログインを実行')

  // ログイン成功可否を確認
  await Promise.race([
    page.waitForLoadState('networkidle', { timeout: 60000 }),
    page.waitForLoadState('domcontentloaded', { timeout: 60000 })
  ])
  const newsDisplay = await page.getByLabel('お知らせ')
  if (await newsDisplay.count()) {
    return true
  } else {
    return false
  }
}

/**
 * システムからログアウトする
 */
export async function logout(page: Page, logger: FileConsoleLogger): Promise<void> {
  logger.info('ログアウトを実行')
  await page.waitForSelector('#loadmsg', { state: 'hidden', timeout: 30000 })
  await page.getByRole('link', { name: ' マイメニュー' }).click()
  await page.getByRole('link', { name: 'ログアウト' }).click()

  // ログアウト完了を待機
  await Promise.race([
    page.waitForLoadState('networkidle', { timeout: 60000 }),
    page.waitForLoadState('domcontentloaded', { timeout: 60000 })
  ])
}
