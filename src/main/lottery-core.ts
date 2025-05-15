import fs from 'fs/promises'
import path from 'path'
import { Member, LotterySetting, LotteryInfo } from '../common/types'
import { Logger, FileConsoleLogger, ensureDirectoryExists } from './util'
import { VALID_COURT_TYPES } from '../common/constants'
import { login, logout } from './browserOperation'
import { chromium } from 'playwright'

export interface LotteryCoreOptions {
  getUserDataPath: () => string
  logger: Logger
  onProgress?: (progress: {
    current: number
    total: number
    percent: number
    message: string
  }) => void
}

// 抽選申込みの設定をファイルから読み込む
export async function loadLotterySetting(
  profileId: string,
  options: LotteryCoreOptions
): Promise<LotterySetting | null> {
  const settingFile = path.join(options.getUserDataPath(), `lottery-setting_${profileId}.json`)
  try {
    const data = await fs.readFile(settingFile, 'utf-8')
    return JSON.parse(data) as LotterySetting
  } catch (err: unknown) {
    const message = `Failed to load lottery setting: ${err instanceof Error ? err.message : String(err)}`
    await options.logger.error(message)
    return null
  }
}

// メンバー情報をファイルから読み込む
export async function loadMembers(
  profileId: string,
  options: LotteryCoreOptions
): Promise<Member[] | null> {
  const membersFile = path.join(options.getUserDataPath(), `profile_${profileId}.json`)
  try {
    const data = await fs.readFile(membersFile, 'utf-8')
    return JSON.parse(data) as Member[]
  } catch (err: unknown) {
    const message = `Failed to load members: ${err instanceof Error ? err.message : String(err)}`
    await options.logger.error(message)
    return null
  }
}

// 抽選申込み処理を全メンバー一括で実行する
export async function executeLottery(
  setting: LotterySetting,
  members: Member[],
  options: LotteryCoreOptions & {
    onProgress?: (progress: {
      current: number
      total: number
      percent: number
      message: string
    }) => void
  }
): Promise<boolean> {
  // ログディレクトリ作成
  const logDir = path.join(options.getUserDataPath(), 'logs')
  await ensureDirectoryExists(logDir)

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
      const logger = new FileConsoleLogger(path.join(logDir, logFileName))

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
        if (options.onProgress) {
          const current = lotteryInfo.lotteryNo
          const total = members.length
          options.onProgress({
            current,
            total,
            percent: Math.floor((current / total) * 100),
            message: `${member.name} (${member.id}) の抽選処理中...`
          })
        }

        // ここに抽選処理を実装
      }
    })
  )

  return true
}

/**
 * 抽選結果を確定する
 * @param profileId プロファイルID
 * @param options LotteryCoreOptions
 * @returns 処理が成功したかどうか
 */
export async function confirmLotteryResult(
  profileId: string,
  members: Member[],
  options: LotteryCoreOptions
): Promise<boolean> {
  // ログディレクトリ作成
  const logDir = path.join(options.getUserDataPath(), 'logs')
  await ensureDirectoryExists(logDir)

  // 並行実行数
  const CONCURRENCY = 5
  // membersをCONCURRENCY数で分割
  const memberChunks = Array.from({ length: CONCURRENCY }, (_, i) =>
    members.filter((_, index) => index % CONCURRENCY === i)
  )

  await Promise.all(
    memberChunks.map(async (chunk, index) => {
      // このプロセス固有のloggerを作成
      const logFileName = `${index}_confirm-lottery-result.log`
      const logger = new FileConsoleLogger(path.join(logDir, logFileName))

      // ブラウザを起動
      const browser = await chromium.launch({ headless: false })
      const context = await browser.newContext()
      const page = await context.newPage()
      page.on('dialog', async (dialog: import('playwright').Dialog) => {
        await dialog.accept()
      })

      for (const member of chunk) {
        await logger.info(`=== 処理開始 ===`)
        await logger.info(`対象メンバー: ${member.name}(id: ${member.id}, pw: ${member.password})`)

        try {
          // ログイン
          const loginSuccess = await login(
            page,
            (msg) => logger.info(msg),
            member.id,
            member.password
          )
          if (!loginSuccess) {
            await logger.error('ログインに失敗しました')
            continue
          }

          // 抽選結果ページへ遷移
          await page.getByRole('link', { name: '抽選 ⏷' }).click()
          await page.getByRole('link', { name: '抽選結果' }).click()
          await page.waitForLoadState('networkidle')

          // 抽選結果確認
          const resultArticle = await page.$('#lottery-result')
          if (resultArticle) {
            const textContent = await resultArticle.textContent()
            if (textContent?.includes('該当する抽選はありません')) {
              // 落選
              await logger.info('落選')
            } else {
              await logger.info('当選')

              // 当選結果テーブルから情報を抽出
              const resultData = await page.evaluate(() => {
                const table = document.querySelector('#lottery-result table')
                if (!table) return null

                const rows = table.querySelectorAll('tbody tr')
                return Array.from(rows).map((row) => {
                  const facility = row
                    .querySelector('td:nth-child(1) span:nth-child(2)')
                    ?.textContent?.trim()
                  const date = row
                    .querySelector('td:nth-child(2) span.dow-saturday')
                    ?.textContent?.trim()
                  const time = row
                    .querySelector('td:nth-child(3) label')
                    ?.textContent?.trim()
                    ?.substring(3)
                  return { facility, date, time }
                })
              })

              if (resultData) {
                for (const data of resultData) {
                  await logger.info(`施設: ${data.facility}`)
                  await logger.info(`利用日: ${data.date}`)
                  await logger.info(`利用時間: ${data.time}`)
                }
              }
            }
          }

          // ログアウト
          await logout(page, (msg) => logger.info(msg))
        } catch (error) {
          logger.error(String(error))
        }
      }

      await browser.close()
    })
  )

  return true
}
