import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Member, Profile, LotteryTarget, Progress, SerializedLotteryTarget } from '../common/types'

// Custom APIs for renderer
const api = {
  loadMembers: (profileId: string) => ipcRenderer.invoke('load-members', profileId),
  saveMembers: (profileId: string, members: Member[]) =>
    ipcRenderer.invoke('save-members', profileId, members),
  loadProfiles: () => ipcRenderer.invoke('load-profiles'),
  saveProfiles: (profiles: Profile[]) => ipcRenderer.invoke('save-profiles', profiles),
  deleteProfile: (profileId: string) => ipcRenderer.invoke('delete-profile', profileId),
  submitLotteryApplication: (
    profileId: string,
    lotteryTargets: LotteryTarget[],
    handleProgress?: boolean
  ) => ipcRenderer.invoke('run-lottery', profileId, lotteryTargets, handleProgress),
  onSubmitLotteryProgress: (callback: (progress: Progress) => void) => {
    ipcRenderer.on('submit-lottery-progress', (_, progress) => callback(progress))
  },
  retryLottery: (lotteryTarget: SerializedLotteryTarget, member: Member) =>
    ipcRenderer.invoke('retry-lottery', lotteryTarget, member),
  getApplicationStatus: (profileId: string) =>
    ipcRenderer.invoke('get-application-status', profileId),
  onGetApplicationStatusProgress: (callback: (progress: Progress) => void) => {
    ipcRenderer.on('get-application-status-progress', (_, progress) => callback(progress))
  },
  cancelApplication: (profileId: string, applicationKey: string) =>
    ipcRenderer.invoke('cancel-application', profileId, applicationKey),
  onUpdateLotteryResultProgress: (callback: (progress: Progress) => void) => {
    ipcRenderer.on('update-lottery-result-progress', (_, progress) => callback(progress))
  },
  confirmLotteryResult: (profileId: number) => {
    return ipcRenderer.invoke('confirm-lottery-result', profileId)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
