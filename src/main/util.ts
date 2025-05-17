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
