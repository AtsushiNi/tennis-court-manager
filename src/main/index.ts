import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { setupLotteryHandlers } from './lottery'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs/promises'
import path from 'path'

const PROFILES_FILE = path.join(app.getPath('userData'), 'profiles.json')

async function ensureDefaultProfile(): Promise<void> {
  try {
    await fs.access(PROFILES_FILE)
  } catch {
    // ファイルが存在しない場合はデフォルトプロファイルを作成
    const defaultProfile = {
      id: 'default',
      name: 'デフォルト'
    }
    await fs.writeFile(PROFILES_FILE, JSON.stringify([defaultProfile], null, 2))
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 抽選ハンドラをセットアップ
  setupLotteryHandlers(mainWindow)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  await ensureDefaultProfile()
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.handle('load-profiles', async () => {
    try {
      const data = await fs.readFile(PROFILES_FILE, 'utf-8')
      return JSON.parse(data)
    } catch (err: unknown) {
      console.error('Failed to load profiles:', err instanceof Error ? err.message : String(err))
      return []
    }
  })

  ipcMain.handle('save-profiles', async (_, profiles: unknown) => {
    try {
      await fs.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2))
      return true
    } catch (err: unknown) {
      console.error('Failed to save profiles:', err instanceof Error ? err.message : String(err))
      return false
    }
  })

  ipcMain.handle('load-members', async (_, profileId: string) => {
    const membersFile = path.join(app.getPath('userData'), `profile_${profileId}.json`)
    const fileExists = await fs
      .access(membersFile)
      .then(() => true)
      .catch(() => false)

    if (fileExists) {
      const data = await fs.readFile(membersFile, 'utf-8')
      return JSON.parse(data)
    } else {
      // ファイルが存在しない場合は空の配列でファイルを作成
      await fs.writeFile(membersFile, JSON.stringify([], null, 2))
      return []
    }
  })

  ipcMain.handle('save-members', async (_, profileId: string, members: unknown) => {
    const membersFile = path.join(app.getPath('userData'), `profile_${profileId}.json`)
    try {
      await fs.writeFile(membersFile, JSON.stringify(members, null, 2))
      return true
    } catch (err: unknown) {
      console.error('Failed to save members:', err instanceof Error ? err.message : String(err))
      return false
    }
  })

  ipcMain.handle('delete-profile', async (_, profileId: string) => {
    try {
      // プロファイルデータを読み込み
      const profilesData = await fs.readFile(PROFILES_FILE, 'utf-8')
      const profiles = JSON.parse(profilesData)

      // 指定プロファイルを除外
      const updatedProfiles = profiles.filter((p: { id: string }) => p.id !== profileId)

      // プロファイルリストを更新
      await fs.writeFile(PROFILES_FILE, JSON.stringify(updatedProfiles, null, 2))

      // 関連メンバーデータファイルを削除
      const membersFile = path.join(app.getPath('userData'), `profile_${profileId}.json`)
      try {
        await fs.unlink(membersFile)
      } catch (err: unknown) {
        // メンバーファイルが存在しない場合は無視
        if (err instanceof Error && 'code' in err && err.code !== 'ENOENT') throw err
      }

      return true
    } catch (err: unknown) {
      console.error('Failed to delete profile:', err instanceof Error ? err.message : String(err))
      return false
    }
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
