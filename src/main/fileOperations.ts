import fs from 'fs/promises'
import path from 'path'
import { app } from 'electron'
import { Member, LotterySetting, Profile } from '../common/types'
import { FileConsoleLogger } from './util'

const DATA_DIR = app.getPath('userData')
const LOG_DIR = path.join(DATA_DIR, 'logs')

const logger = new FileConsoleLogger('file-operations.log')

/**
 * プロファイルデータの読み込み
 */
export async function loadProfiles(): Promise<Profile[]> {
  const profilesFile = path.join(DATA_DIR, 'profiles.json')
  try {
    const data = await fs.readFile(profilesFile, 'utf-8')
    return JSON.parse(data)
  } catch (err: unknown) {
    logger.error(`Failed to load profiles: ${err instanceof Error ? err.message : String(err)}`)
    return []
  }
}

/**
 * プロファイルデータの保存
 */
export async function saveProfiles(profiles: Profile[]): Promise<boolean> {
  const profilesFile = path.join(DATA_DIR, 'profiles.json')
  try {
    await fs.writeFile(profilesFile, JSON.stringify(profiles, null, 2))
    return true
  } catch (err: unknown) {
    logger.error(`Failed to save profiles: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

/**
 * 初期プロファイルの作成
 */
export async function ensureDefaultProfile(): Promise<void> {
  const profilesFile = path.join(DATA_DIR, 'profiles.json')
  try {
    await fs.access(profilesFile)
  } catch {
    // ファイルが存在しない場合はデフォルトプロファイルを作成
    const defaultProfile = {
      id: 'default',
      name: 'デフォルト'
    } as Profile
    await fs.writeFile(profilesFile, JSON.stringify([defaultProfile], null, 2))
  }
}

/**
 * プロファイルデータの削除
 */
export async function deleteProfile(profileId: string): Promise<boolean> {
  try {
    // プロファイルリストから指定プロファイルを除外
    const profilesFile = path.join(DATA_DIR, 'profiles.json')
    const profilesData = await fs.readFile(profilesFile, 'utf-8')
    const profiles = JSON.parse(profilesData) as Profile[]
    const updatedProfiles = profiles.filter((profile) => profile.id !== profileId)
    await fs.writeFile(profilesFile, JSON.stringify(updatedProfiles, null, 2))

    // 関連データファイルを削除
    const membersFile = path.join(DATA_DIR, `profile_${profileId}.json`)
    try {
      await fs.unlink(membersFile)
    } catch (err: unknown) {
      // ファイルが存在しない場合は無視
      if (err instanceof Error && 'code' in err && err.code !== 'ENOENT') throw err
    }

    return true
  } catch (err: unknown) {
    logger.error(`Failed to delete profile: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

/**
 * メンバーデータの読み込み
 */
export async function loadMembers(profileId: string): Promise<Member[]> {
  const membersFile = path.join(DATA_DIR, `profile_${profileId}.json`)
  try {
    const data = await fs.readFile(membersFile, 'utf-8')
    return JSON.parse(data) as Member[]
  } catch (err: unknown) {
    await logger.error(
      `Failed to load members: ${err instanceof Error ? err.message : String(err)}`
    )
    return []
  }
}

/**
 * メンバーデータの保存
 */
export async function saveMembers(profileId: string, members: Member[]): Promise<boolean> {
  const membersFile = path.join(DATA_DIR, `profile_${profileId}.json`)
  try {
    await fs.writeFile(membersFile, JSON.stringify(members, null, 2))
    return true
  } catch (err: unknown) {
    logger.error(`Failed to save members: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

/**
 * 抽選設定の読み込み
 */
export async function loadLotterySetting(profileId: string): Promise<LotterySetting | null> {
  const settingFile = path.join(DATA_DIR, `lottery-setting_${profileId}.json`)
  try {
    const data = await fs.readFile(settingFile, 'utf-8')
    return JSON.parse(data) as LotterySetting
  } catch (err: unknown) {
    logger.error(
      `Failed to load lottery setting: ${err instanceof Error ? err.message : String(err)}`
    )
    return null
  }
}

/**
 * 抽選設定の保存
 */
export async function saveLotterySetting(
  profileId: string,
  setting: LotterySetting
): Promise<boolean> {
  const settingFile = path.join(DATA_DIR, `lottery-setting_${profileId}.json`)
  try {
    await fs.writeFile(settingFile, JSON.stringify(setting, null, 2))
    return true
  } catch (err: unknown) {
    logger.error(
      `Failed to save lottery setting: ${err instanceof Error ? err.message : String(err)}`
    )
    return false
  }
}

/**
 * ログの出力
 */
export async function saveLog(logFileName: string, message: string): Promise<void> {
  // ログフォルダの確認
  try {
    await fs.access(LOG_DIR)
  } catch {
    await fs.mkdir(LOG_DIR, { recursive: true })
  }

  // ログの出力
  await fs.appendFile(path.join(LOG_DIR, logFileName), message)
}
