import type { Dayjs } from 'dayjs'
export interface Court {
  name: string
  type: 'テニス（人工芝）' | 'テニス（ハード）'
}

export type CourtType = Court['type'];

export interface Member {
  key: string
  name: string
  id: number
  password: string
}

export interface Progress {
  current: number
  total: number
  message: string
}

export interface LotteryResult {
  member: Member
  facility?: string
  date?: string
  time?: string
  status: 'win' | 'lose' | 'login-failed' | 'error'
}

export interface Profile {
  id: string
  name: string
}

export interface ApplicationStatus {
  key: string
  date: string
  timeSlot: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  courtNumber?: number
}

export interface LotteryTarget {
  date: Dayjs
  startHour: number
  court: Court
}

export interface LotteryInfo {
  lotteryNo: number
  member: Member
  lotteryTarget: LotteryTarget
}

export interface LotterySetting {
  profileId: string
  targets: LotteryTarget[]
}
