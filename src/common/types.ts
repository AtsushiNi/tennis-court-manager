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

export interface LotteryOperationResult {
  member: Member
  lotteryTarget: LotteryTarget
  successNumber: 0 | 1 | 2
  status: 'success' | 'login-failed' | 'error'
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

export interface LotteryStatus {
  member: Member
  court: string
  date: string
  time: string
}
export interface LotteryResultStatus {
  member: Member
  court: string
  date: string
  time: string
}
export interface ReservationStatus {
  member: Member
  court: string
  date: string
  time: string
}
export interface ApplicationStatus {
  errorMembers: Member[]
  loginFailedMembers: Member[]
  lotteries: LotteryStatus[]
  lotteryResults: LotteryResultStatus[]
  reservations: ReservationStatus[]
}

export interface SerializedLotteryTarget {
  date: string
  startHour: number
  court: Court
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
