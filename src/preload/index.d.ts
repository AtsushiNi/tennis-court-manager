import { ElectronAPI } from '@electron-toolkit/preload'
import { AppAPI } from '../../types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
