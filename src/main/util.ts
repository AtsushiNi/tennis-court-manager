import fs from 'fs/promises'
import path from 'path'
import { app } from 'electron'

/**
 * ファイルとコンソールに同時にログを出力するLogger実装クラス
 */
export class FileConsoleLogger {
  private logFileName: string
  private logDir: string

  constructor(logFileName: string) {
    this.logFileName = logFileName
    this.logDir = path.join(app.getPath('userData'), 'logs')
  }

  /**
   * ログをファイルとコンソールに出力する内部メソッド
   */
  private async log(level: string, message: string): Promise<void> {
    const timestamp = new Date().toISOString()
    const formattedMessage = `[${timestamp}] [${level}] ${message}\n`

    // ファイル出力
    try {
      await fs.access(this.logDir)
    } catch {
      await fs.mkdir(this.logDir, { recursive: true })
    }
    await fs.appendFile(path.join(this.logDir, this.logFileName), formattedMessage)

    // コンソール出力
    console[level === 'info' ? 'log' : level](formattedMessage.trim())
  }

  async debug(message: string): Promise<void> {
    await this.log('debug', message)
  }

  async info(message: string): Promise<void> {
    await this.log('info', message)
  }

  async warn(message: string): Promise<void> {
    await this.log('warn', message)
  }

  async error(message: string): Promise<void> {
    await this.log('error', message)
  }
}

/**
 * 数字を全角に変換する
 * @param num - 変換する数字（数値または文字列）
 * @returns 全角数字の文字列
 */
export function toFullWidthNumber(num: number | string): string {
  const halfToFullMap: Record<string, string> = {
    '0': '０',
    '1': '１',
    '2': '２',
    '3': '３',
    '4': '４',
    '5': '５',
    '6': '６',
    '7': '７',
    '8': '８',
    '9': '９'
  }

  return String(num).replace(/[0-9]/g, (match) => halfToFullMap[match])
}
