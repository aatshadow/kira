import { create } from 'zustand'
import type { Meeting } from '@/types/meeting'

interface MeetingStore {
  meetings: Meeting[]
  loading: boolean

  setMeetings: (meetings: Meeting[]) => void
  addMeeting: (meeting: Meeting) => void
  updateMeeting: (id: string, data: Partial<Meeting>) => void
  removeMeeting: (id: string) => void
  setLoading: (loading: boolean) => void
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  meetings: [],
  loading: false,

  setMeetings: (meetings) => set({ meetings }),
  addMeeting: (meeting) =>
    set((s) => ({ meetings: [meeting, ...s.meetings] })),
  updateMeeting: (id, data) =>
    set((s) => ({
      meetings: s.meetings.map((m) => (m.id === id ? { ...m, ...data } : m)),
    })),
  removeMeeting: (id) =>
    set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) })),
  setLoading: (loading) => set({ loading }),
}))
