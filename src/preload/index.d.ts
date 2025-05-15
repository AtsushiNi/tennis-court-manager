import { ElectronAPI } from '@electron-toolkit/preload'
import { LotteryTarget } from 'src/common/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      loadMembers: (profileId: string) => Promise<Member[]>
      saveMembers: (profileId: string, members: Member[]) => Promise<boolean>
      loadProfiles: () => Promise<Profile[]>
      saveProfiles: (profiles: Profile[]) => Promise<boolean>
      deleteProfile: (profileId: string) => Promise<boolean>
      submitLotteryApplication: (
        profileId: string,
        lotteryTargets: LotteryTarget[]
      ) => Promise<{ success: boolean; message?: string }>
      getApplicationStatus: (profileId: string) => Promise<ApplicationStatus[]>
      cancelApplication: (profileId: string, applicationKey: string) => Promise<boolean>
    }
  }
}
