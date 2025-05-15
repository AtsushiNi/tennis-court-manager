import { ipcMain, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { loadLotterySetting, loadMembers, executeLottery, LotteryCoreOptions } from './lottery-core'
import { FileConsoleLogger } from './util'

// Electronからlottery-core.tsを使うための関数
export function setupLotteryHandlers(): void {
  const getUserDataPath = (): string => app.getPath('userData')
  const logger = new FileConsoleLogger(path.join(getUserDataPath(), 'lottery.log'))
  const options: LotteryCoreOptions = {
    getUserDataPath,
    logger
  }

  // 抽選設定読み込み
  ipcMain.handle('load-lottery-setting', async (_, profileId: string) => {
    return await loadLotterySetting(profileId, options)
  })

  // 抽選設定保存
  ipcMain.handle('save-lottery-setting', async (_, profileId: string, setting: unknown) => {
    const settingFile = path.join(getUserDataPath(), `lottery-setting_${profileId}.json`)
    try {
      await fs.writeFile(settingFile, JSON.stringify(setting, null, 2))
      return true
    } catch (err: unknown) {
      await logger.error(
        `Failed to save lottery setting: ${err instanceof Error ? err.message : String(err)}`
      )
      return false
    }
  })

  // 抽選実行
  ipcMain.handle('run-lottery', async (_, profileId: string) => {
    try {
      // 抽選設定とメンバー情報を取得
      const setting = await loadLotterySetting(profileId, options)
      const members = await loadMembers(profileId, options)

      if (!setting || !members) {
        throw new Error('抽選設定またはメンバー情報が読み込めませんでした')
      }

      // 抽選実行
      return await executeLottery(setting, members, options)
    } catch (err: unknown) {
      await logger.error(`抽選実行エラー: ${err instanceof Error ? err.message : String(err)}`)
      return false
    }
  })
}
