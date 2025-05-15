#!/usr/bin/env node
import path from 'path'
import { loadLotterySetting, loadMembers, executeLottery, LotteryCoreOptions } from './lottery-core'
import { FileConsoleLogger } from './util'

// コマンドでlottery-core.tsを使うための関数
async function main(): Promise<void> {
  const logger = new FileConsoleLogger(path.join(getUserDataPath(), 'lottery-cli.log'))

  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Usage: node lottery-cli.js <profileId>')
    process.exit(1)
  }
  const profileId = args[0]

  const options: LotteryCoreOptions = {
    getUserDataPath,
    logger
  }

  try {
    // 抽選設定とメンバー情報を取得
    const setting = await loadLotterySetting(profileId, options)
    const members = await loadMembers(profileId, options)

    if (!setting || !members) {
      throw new Error('抽選設定またはメンバー情報が読み込めませんでした')
    }

    // 抽選実行
    const result = await executeLottery(setting, members, options)
    await logger.info(result ? '抽選が正常に完了しました' : '抽選に失敗しました')
    process.exit(result ? 0 : 1)
  } catch (err) {
    await logger.error(`抽選実行エラー: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }
}

function getUserDataPath(): string {
  // Electronのapp.getPath('userData')の代わりに、クロスプラットフォームなデータディレクトリを使用
  return (
    process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(process.env.HOME || '', 'Library', 'Application Support', 'tennis-court-manager')
      : path.join(process.env.HOME || '', '.config', 'tennis-court-manager'))
  )
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
