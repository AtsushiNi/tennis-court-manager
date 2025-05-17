import { ipcMain } from 'electron'
import { executeLottery, confirmLotteryResult, getApplicationStatus } from './lottery-core'
import { FileConsoleLogger } from './util'
import { ApplicationStatus, LotterySetting, Progress } from '../common/types'
import { loadLotterySetting, saveLotterySetting, loadMembers } from './fileOperations'

// Electronからlottery-core.tsを使うための関数
export function setupLotteryHandlers(mainWindow: Electron.BrowserWindow): void {
  const logger = new FileConsoleLogger('lottery.log')

  // 抽選設定読み込み
  ipcMain.handle('load-lottery-setting', async (_, profileId: string) => {
    return await loadLotterySetting(profileId)
  })

  // 抽選設定保存
  ipcMain.handle('save-lottery-setting', async (_, profileId: string, setting: LotterySetting) => {
    return await saveLotterySetting(profileId, setting)
  })

  // 抽選実行
  ipcMain.handle('run-lottery', async (_, profileId: string) => {
    try {
      // 抽選設定とメンバー情報を取得
      const setting = await loadLotterySetting(profileId)
      const members = await loadMembers(profileId)

      if (!setting) {
        throw new Error('抽選設定またはメンバー情報が読み込めませんでした')
      }

      // 抽選実行
      const progressCallback = (progress: Progress): void => {
        mainWindow.webContents.send('lottery-progress', progress)
      }
      return await executeLottery(setting, members, progressCallback)
    } catch (err: unknown) {
      await logger.error(`抽選実行エラー: ${err instanceof Error ? err.message : String(err)}`)
      return false
    }
  })

  // 状況確認
  ipcMain.handle(
    'get-application-status',
    async (_, profileId: string): Promise<ApplicationStatus | null> => {
      try {
        const members = await loadMembers(profileId)

        const progressCallback = (progress: Progress): void => {
          mainWindow.webContents.send('get-application-status-progress', progress)
        }

        const status = await getApplicationStatus(members, progressCallback)

        return status
      } catch (err: unknown) {
        await logger.error(`状況確認エラー: ${err instanceof Error ? err.message : String(err)}`)
        return null
      }
    }
  )

  // 抽選結果確定
  ipcMain.handle('confirm-lottery-result', async (_, profileId: string) => {
    try {
      const members = await loadMembers(profileId)

      const progressCallback = (progress: Progress): void => {
        mainWindow.webContents.send('update-lottery-result-progress', progress)
      }

      const result = await confirmLotteryResult(members, progressCallback)

      return result
    } catch (err: unknown) {
      await logger.error(`抽選結果確定エラー: ${err instanceof Error ? err.message : String(err)}`)
      return false
    }
  })
}
