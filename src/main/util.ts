import fs from 'fs/promises'

/**
 * ログ出力のためのインターフェース
 */
export interface Logger {
  debug(message: string): Promise<void>
  info(message: string): Promise<void>
  warn(message: string): Promise<void>
  error(message: string): Promise<void>
}

/**
 * ファイルとコンソールに同時にログを出力するLogger実装クラス
 */
export class FileConsoleLogger implements Logger {
  private logFilePath: string

  constructor(logFilePath: string) {
    this.logFilePath = logFilePath
  }

  /**
   * ログをファイルとコンソールに出力する内部メソッド
   */
  private async log(level: string, message: string): Promise<void> {
    const timestamp = new Date().toISOString()
    const formattedMessage = `[${timestamp}] [${level}] ${message}\n`
    await fs.appendFile(this.logFilePath, formattedMessage)
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
 * 指定されたディレクトリが存在しない場合に作成する
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath)
  } catch {
    await fs.mkdir(dirPath, { recursive: true })
  }
}

/**
 * DateオブジェクトをISO形式の文字列にフォーマットする
 */
export function formatDate(date: Date): string {
  return date.toISOString().replace(/T/, ' ').replace(/\..+/, '')
}
