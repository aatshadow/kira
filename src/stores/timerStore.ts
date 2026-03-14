import { create } from 'zustand'
import type { ActiveTimer } from '@/types/timer'

interface TimerStore {
  sessions: ActiveTimer[]
  activeSessionId: string | null

  addSession: (session: ActiveTimer) => void
  removeSession: (id: string) => void
  setActiveSession: (id: string | null) => void
  pauseSession: (id: string) => void
  resumeSession: (id: string) => void
  tick: () => void
  updateSessionElapsed: (id: string, elapsed: number) => void
  clearAll: () => void
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,

  addSession: (session) =>
    set((state) => ({
      sessions: [...state.sessions, session],
    })),

  removeSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
    })),

  setActiveSession: (id) => set({ activeSessionId: id }),

  pauseSession: (id) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id
          ? { ...s, status: 'paused' as const, pausedAt: Date.now() }
          : s
      ),
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
    })),

  resumeSession: (id) => {
    const { activeSessionId, sessions } = get()
    set({
      sessions: sessions.map((s) => {
        if (s.id === id) {
          const pausedDuration = s.pausedAt ? Math.floor((Date.now() - s.pausedAt) / 1000) : 0
          return {
            ...s,
            status: 'running' as const,
            pausedAt: null,
            totalPausedSecs: s.totalPausedSecs + pausedDuration,
          }
        }
        if (s.id === activeSessionId) {
          return { ...s, status: 'paused' as const, pausedAt: Date.now() }
        }
        return s
      }),
      activeSessionId: id,
    })
  },

  tick: () => {
    const { activeSessionId, sessions } = get()
    if (!activeSessionId) return

    set({
      sessions: sessions.map((s) => {
        if (s.id === activeSessionId && s.status === 'running') {
          const totalElapsed = Math.floor((Date.now() - s.startedAt) / 1000) - s.totalPausedSecs
          return { ...s, elapsedSecs: totalElapsed }
        }
        return s
      }),
    })
  },

  updateSessionElapsed: (id, elapsed) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, elapsedSecs: elapsed } : s
      ),
    })),

  clearAll: () => set({ sessions: [], activeSessionId: null }),
}))
