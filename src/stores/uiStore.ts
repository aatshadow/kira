import { create } from 'zustand'

interface UIStore {
  theme: 'dark' | 'light'
  timerFloatOpen: boolean
  activeModal: string | null
  modalData: Record<string, unknown> | null

  toggleTheme: () => void
  setTheme: (theme: 'dark' | 'light') => void
  openTimerFloat: () => void
  closeTimerFloat: () => void
  toggleTimerFloat: () => void
  openModal: (name: string, data?: Record<string, unknown>) => void
  closeModal: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'dark',
  timerFloatOpen: false,
  activeModal: null,
  modalData: null,

  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark'
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', newTheme === 'dark')
      }
      return { theme: newTheme }
    }),
  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
    set({ theme })
  },
  openTimerFloat: () => set({ timerFloatOpen: true }),
  closeTimerFloat: () => set({ timerFloatOpen: false }),
  toggleTimerFloat: () => set((s) => ({ timerFloatOpen: !s.timerFloatOpen })),
  openModal: (name, data) => set({ activeModal: name, modalData: data ?? null }),
  closeModal: () => set({ activeModal: null, modalData: null }),
}))
