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

export interface AppAPI {
  loadMembers: (profileId: string) => Promise<Member[]>
  saveMembers: (profileId: string, members: Member[]) => Promise<boolean>
  loadProfiles: () => Promise<Profile[]>
  saveProfiles: (profiles: Profile[]) => Promise<boolean>
  deleteProfile: (profileId: string) => Promise<boolean>
}
