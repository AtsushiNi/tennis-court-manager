import { ElectronAPI } from '@electron-toolkit/preload'
import {
  LotteryResult,
  Progress,
  ApplicationStatus,
  Profile,
  Member,
  SerializedLotteryTarget,
  LotteryOperationResult,
  ReservationSetting
} from 'src/common/types'

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
        lotteryTargets: SerializedLotteryTarget[],
        handleProgress?: boolean
      ) => Promise<LotteryOperationResult[]>
      onSubmitLotteryProgress: (callback: (progress: Progress) => void) => void
      retryLottery: (
        lotteryTarget: SerializedLotteryTarget,
        member: Member
      ) => Promise<LotteryOperationResult>
      getApplicationStatus: (profileId: string) => Promise<ApplicationStatus>
      onGetApplicationStatusProgress: (callback: (progress: Progress) => void) => void
      cancelApplication: (profileId: string, applicationKey: string) => Promise<boolean>
      onUpdateLotteryResultProgress: (callback: (progress: Progress) => void) => void
      confirmLotteryResult: (profileId: string) => Promise<LotteryResult[]>
      saveReservationSetting: (profileId: string, setting: ReservationSetting) => Promise<boolean>
      loadReservationSetting: (profileId: string) => Promise<ReservationSetting>
    }
  }
}
