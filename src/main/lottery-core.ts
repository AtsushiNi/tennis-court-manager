import { Member, LotterySetting, LotteryInfo, LotteryResult, Progress } from '../common/types'
import { FileConsoleLogger } from './util'
import { VALID_COURT_TYPES } from '../common/constants'
import { login } from './browserOperation'
import { chromium, Page } from 'playwright'

/*
 * 抽選申込み処理を全メンバー一括で実行する
 */
export async function executeLottery(
  setting: LotterySetting,
  members: Member[],
  onProgress: (progress: Progress) => void
): Promise<boolean> {
  // ユーザーを予約コート・日時で均等に振り分け
  const lotteryInfoGroup: LotteryInfo[][] = Array.from({ length: setting.targets.length }, () => [])
  members.forEach((member: Member, i: number) => {
    const targetIndex = i % setting.targets.length
    const lotteryTarget = setting.targets[targetIndex]

    const lotteryInfo = {
      lotteryNo: i + 1,
      member,
      lotteryTarget
    }

    lotteryInfoGroup[targetIndex].push(lotteryInfo)
  })

  // 各予約コート・日時ごとに抽選を並行処理
  await Promise.all(
    lotteryInfoGroup.map(async (lotteryInfoList, index: number) => {
      const { lotteryTarget } = lotteryInfoList[0]
      // このプロセス固有のloggerを作成
      const logFileName = `${index}_${lotteryTarget.date.month() + 1}-${lotteryTarget.date.date()}${lotteryTarget.court.name.replace(/\s+/g, '_')}_${lotteryTarget.startHour}.log`
      const logger = new FileConsoleLogger(logFileName)

      await logger.info(`=== 処理開始 ===`)
      await logger.info(`対象コート: ${lotteryTarget.court.name} (${lotteryTarget.court.type})`)
      await logger.info(`対象日: ${lotteryTarget.date.month() + 1}月${lotteryTarget.date.date()}日`)
      await logger.info(`対象時間: ${lotteryTarget.startHour}:00~`)

      // コートタイプのバリデーション
      if (!VALID_COURT_TYPES.includes(lotteryTarget.court.type)) {
        await logger.error('エラー: 無効なコートタイプです。許可される値:')
        VALID_COURT_TYPES.forEach((type) => logger.info(`- ${type}`))
        return
      }

      // TODO: 実際の抽選処理を実装
      for (const lotteryInfo of lotteryInfoList) {
        const { lotteryNo, member } = lotteryInfo
        await logger.info(
          `=== 処理開始: #${lotteryNo} ${member.name} (利用者番号: ${member.id}) ===`
        )

        // 進捗通知
        onProgress({
          current: lotteryInfo.lotteryNo,
          total: members.length,
          message: `${member.name} (${member.id}) の抽選処理中...`
        })

        // ここに抽選処理を実装
      }
    })
  )

  return true
}

/**
 * 抽選結果を確定する
 */
export async function confirmLotteryResult(
  members: Member[],
  onProgress: (progress: Progress) => void
): Promise<LotteryResult[]> {
  // 並行実行数
  const CONCURRENCY = 5
  // membersをCONCURRENCY数で分割
  const memberChunks = Array.from({ length: CONCURRENCY }, (_, i) =>
    members.filter((_, index) => index % CONCURRENCY === i)
  )

  const totalMembers = members.length
  let processedCount = 0
  const lotteryResults: LotteryResult[] = []

  await Promise.all(
    memberChunks.map(async (chunk, index) => {
      // このプロセス固有のloggerを作成
      const logFileName = `${index}_confirm-lottery-result.log`
      const logger = new FileConsoleLogger(logFileName)

      const { browser, page } = await initBrowser()

      for (const member of chunk) {
        processedCount++
        onProgress({
          current: processedCount,
          total: totalMembers,
          message: `${member.name} の抽選結果を確認中...`
        })
        const result = await confirmLotteryResultForMember(page, member, logger)
        if (result) {
          lotteryResults.push(result)
        }
      }

      await browser.close()
    })
  )

  // エラーになったメンバーに関して再実行する
  const errorResults = lotteryResults.filter(result => result.status === 'error')
  const { browser, page } = await initBrowser()
  const logger = new FileConsoleLogger('confirm-lottery-result-retry.log')
  for (const [index, result] of errorResults.entries()) {
    onProgress({
      current: index+1,
      total: errorResults.length,
      message: `${result.member.name} の抽選結果を再確認中...`
    })
    const newResult = await confirmLotteryResultForMember(page, result.member, logger)
    // 結果の書き換え
    const resultIndex = lotteryResults.findIndex(r => r.member.id === result.member.id)
    if (resultIndex !== -1) {
      if (newResult) {
        lotteryResults[resultIndex] = newResult
      } else {
        lotteryResults.splice(resultIndex, 1)
      }
    }
  }
  await browser.close()

  return lotteryResults
}

async function confirmLotteryResultForMember(
  page: Page,
  member: Member,
  logger: FileConsoleLogger
): Promise<LotteryResult | null> {
  await logger.info(`=== 処理開始 ===`)
  await logger.info(`対象メンバー: ${member.name}(id: ${member.id}, pw: ${member.password})`)

  try {
    // ログイン
    const loginSuccess = await login(page, logger, member.id, member.password)
    if (!loginSuccess) {
      await logger.error('ログインに失敗しました')
      return createResult(member, 'login-failed')
    }

    // 抽選結果取得
    const resultData = await getLotteryResults(page, logger)
    if (!resultData) {
      await logger.info('落選')
      return null
    }

    // 抽選結果確定
    await page.getByRole('button', { name: ' 確認' }).click()
    await page.waitForLoadState('networkidle')
    await page.getByLabel('利用人数').fill('4')
    // await page.getByRole('button', { name: ' 確認' }).click()
    // await page.waitForLoadState('networkidle')

    // 結果データ処理
    await logger.info('当選')
    await logger.info(`施設: ${resultData.facility}`)
    await logger.info(`利用日: ${resultData.date}`)
    await logger.info(`利用時間: ${resultData.time}`)
    return createResult(member, 'win', resultData)
  } catch (error) {
    logger.error(String(error))
    return createResult(member, 'error')
  }
}

/**
 * ブラウザを初期化する
 */
async function initBrowser(): Promise<{
  browser: import('playwright').Browser
  page: import('playwright').Page
}> {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  // 自動入力関連のリクエストを抑制
  await page.setExtraHTTPHeaders({
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  })

  page.on('dialog', async (dialog: import('playwright').Dialog) => {
    await dialog.accept()
  })

  return { browser, page }
}

/**
 * 抽選結果ページからデータを取得する
 */
async function getLotteryResults(
  page: import('playwright').Page,
  logger: FileConsoleLogger
): Promise<{ facility?: string; date?: string; time?: string } | null> {
  try {
    await logger.info('抽選結果ページへ遷移します')
    await page.getByRole('link', { name: '抽選 ⏷' }).click()
    await page.getByRole('link', { name: '抽選結果' }).click()
    await page.waitForLoadState('networkidle')

    await logger.info('抽選結果を確認中...')
    const resultArticle = await page.$('#lottery-result')
    if (!resultArticle) {
      throw new Error('抽選結果ページで内容を取得できませんでした')
    }

    const textContent = await resultArticle.textContent()

    // 落選
    if (textContent?.includes('該当する抽選はありません')) {
      return null
    }

    // 当選結果テーブルから情報を抽出
    return await page.evaluate(() => {
      const table = document.querySelector('#lottery-result table')
      if (!table) return null

      const rows = table.querySelectorAll('tbody tr')
      const firstRow = Array.from(rows)[0]
      const facility = firstRow
        .querySelector('td:nth-child(1) span:nth-child(2)')
        ?.textContent?.trim()
      const date = firstRow.querySelector('td:nth-child(2) span.dow-saturday')?.textContent?.trim()
      const time = firstRow
        .querySelector('td:nth-child(3) label')
        ?.textContent?.trim()
        ?.substring(3)

      // 選択チェックボックスをクリック
      const checkbox = firstRow.querySelector('input[name="checkElect"]')
      if (checkbox) {
        ;(checkbox as HTMLInputElement).click()
      }

      return { facility, date, time }
    })
  } catch (error) {
    await logger.error(`抽選結果取得中にエラーが発生しました: ${error}`)
    throw error
  }
}

/**
 * LotteryResultオブジェクトを生成する
 */
function createResult(
  member: Member,
  status: 'win' | 'login-failed' | 'error',
  data?: { facility?: string; date?: string; time?: string }
): LotteryResult {
  return {
    member,
    status,
    ...(data && {
      facility: data.facility,
      date: data.date,
      time: data.time
    })
  }
}
