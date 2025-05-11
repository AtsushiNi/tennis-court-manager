import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Member, Profile, LotteryTarget } from '../common/types'

// Custom APIs for renderer
const api = {
  loadMembers: (profileId: string) => ipcRenderer.invoke('load-members', profileId),
  saveMembers: (profileId: string, members: Member[]) =>
    ipcRenderer.invoke('save-members', profileId, members),
  loadProfiles: () => ipcRenderer.invoke('load-profiles'),
  saveProfiles: (profiles: Profile[]) => ipcRenderer.invoke('save-profiles', profiles),
  deleteProfile: (profileId: string) => ipcRenderer.invoke('delete-profile', profileId),
  submitLotteryApplication: (profileId: string, lotteryTargets: LotteryTarget[]) =>
    ipcRenderer.invoke('run-lottery', profileId, lotteryTargets),
  getApplicationStatus: (profileId: string) =>
    ipcRenderer.invoke('get-application-status', profileId),
  cancelApplication: (profileId: string, applicationKey: string) =>
    ipcRenderer.invoke('cancel-application', profileId, applicationKey)
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
