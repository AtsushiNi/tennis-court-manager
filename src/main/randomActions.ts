import { Page } from 'playwright'
import { FileConsoleLogger } from './util'

/**
 * reCAPTCHA回避のため、ランダムな挙動を入れる
 */
export async function actRandom(page: Page, logger: FileConsoleLogger): Promise<void> {
  try {
    // ランダムな待機（1500ms〜2500ms）
    const waitTime = Math.random() * 1000 + 1500
    await page.waitForTimeout(waitTime)

    // フォーカス操作
    await performFocusAction(page, logger)
    // マウス移動
    await performMouseMoveAction(page, logger)
    await performMouseMoveAction(page, logger)
    await performMouseMoveAction(page, logger)
    // スクロール操作
    await performScrollAction(page, logger)

    // アクション後のランダムな待機（1500ms〜2500ms）
    const waitTimeAfterAction = Math.random() * 1000 + 1500
    await page.waitForTimeout(waitTimeAfterAction)

    // 一番上までスクロール
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  } catch (error) {
    logger.info(`ランダムアクション実行中にエラーが発生しました: ${error}`)
  }
}

/**
 * フォーカス操作を実行する
 */
async function performFocusAction(page: Page, logger: FileConsoleLogger): Promise<void> {
  // フォーカス可能な要素を取得（リンク、ボタン、入力フィールドなど）
  const focusableElements = page.locator(
    'a:not([disabled]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
  )

  const elementCount = await focusableElements.count()

  // 要素が見つかった場合のみ実行
  if (elementCount > 0) {
    // ランダムに要素を選択
    const randomIndex = Math.floor(Math.random() * elementCount)
    const randomElement = focusableElements.nth(randomIndex)

    // フォーカスを当てる
    await randomElement.focus()

    // フォーカスした要素の情報をログに出力
    const textContent = await randomElement.evaluate((el: Element) => el.textContent?.trim() || '')
    logger.info(
      `フォーカスした要素: ${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}`
    )
  } else {
    logger.info('フォーカス可能な要素が見つかりませんでした')
  }
}

/**
 * マウス移動操作を実行する
 */
async function performMouseMoveAction(page: Page, logger: FileConsoleLogger): Promise<void> {
  // ページのサイズを取得
  const viewport = page.viewportSize()
  if (!viewport) return

  // ランダムな座標にマウスを移動
  const randomX = Math.floor(Math.random() * viewport.width)
  const randomY = Math.floor(Math.random() * viewport.height)

  await page.mouse.move(randomX, randomY, { steps: Math.floor(Math.random() * 10) + 5 })
  await page.waitForTimeout(1000)
  logger.info(`マウスを移動: (${randomX}, ${randomY})`)
}

/**
 * スクロール操作を実行する
 */
async function performScrollAction(page: Page, logger: FileConsoleLogger): Promise<void> {
  // ページの高さを取得
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  const viewportHeight = page.viewportSize()?.height || 800

  // スクロール可能な範囲を計算
  const maxScrollY = Math.max(0, pageHeight - viewportHeight)

  if (maxScrollY > 0) {
    // ランダムなスクロール位置を決定
    const randomScrollY = Math.floor(Math.random() * maxScrollY)

    // スクロールを実行
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), randomScrollY)
    logger.info(`スクロール: ${randomScrollY}px`)
  } else {
    logger.info('スクロール可能な範囲がありません')
  }
}
