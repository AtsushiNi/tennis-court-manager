import fs from 'fs/promises'
import path from 'path'
import { Member, LotterySetting, LotteryInfo } from '../common/types'
import { Logger, FileConsoleLogger, ensureDirectoryExists } from './util'
import { VALID_COURT_TYPES } from '../common/constants'

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
      const logFileName = `${index}_${lotteryTarget.date.month()+1}-${lotteryTarget.date.date()}${lotteryTarget.court.name.replace(/\s+/g, '_')}_${lotteryTarget.startHour}.log`
      const logger = new FileConsoleLogger(path.join(logDir, logFileName))

      await logger.info(`=== 処理開始 ===`)
      await logger.info(`対象コート: ${lotteryTarget.court.name} (${lotteryTarget.court.type})`)
      await logger.info(`対象日: ${lotteryTarget.date.month()+1}月${lotteryTarget.date.date()}日`)
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
