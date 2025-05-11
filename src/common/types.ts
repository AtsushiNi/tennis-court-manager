export interface Court {
  name: string
  type: 'テニス（人工芝）' | 'テニス（ハード）'
}

export type CourtType = Court['type'];

export interface Member {
  key: string
  name: string
  id: string
  password: string
}

export interface Profile {
  id: string
  name: string
}

export interface LotteryApplicationData {
  memberId: string
  name: string
  date: string
  timeSlot: string
}

export interface ApplicationStatus {
  key: string
  date: string
  timeSlot: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  courtNumber?: number
}
