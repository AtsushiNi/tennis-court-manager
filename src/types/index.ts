export interface Member {
  key: string
  name: string
  id: string
  password: string
}

export interface AppAPI {
  loadMembers: () => Promise<Member[]>
  saveMembers: (members: Member[]) => Promise<boolean>
}
