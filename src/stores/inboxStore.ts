import { create } from 'zustand'

export interface InboxThread {
  id: string
  user_id: string
  channel: 'whatsapp' | 'gmail' | 'instagram' | 'linkedin'
  contact_name: string | null
  contact_id: string | null
  contact_avatar: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  pipeline_stage: 'new' | 'replied' | 'follow_up' | 'closed'
  is_pinned: boolean
  tags: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface InboxMessage {
  id: string
  user_id: string
  channel: string
  thread_id: string | null
  contact_name: string | null
  contact_id: string | null
  direction: 'inbound' | 'outbound'
  content: string | null
  content_type: 'text' | 'image' | 'file' | 'audio' | 'email'
  metadata: Record<string, unknown>
  is_read: boolean
  is_starred: boolean
  pipeline_stage: string | null
  tags: string[]
  external_id: string | null
  external_timestamp: string | null
  created_at: string
}

interface InboxStore {
  threads: InboxThread[]
  messages: InboxMessage[]
  loading: boolean
  activeThread: string | null
  channelFilter: string | null
  pipelineFilter: string | null

  setThreads: (threads: InboxThread[]) => void
  setMessages: (messages: InboxMessage[]) => void
  setLoading: (loading: boolean) => void
  setActiveThread: (id: string | null) => void
  setChannelFilter: (channel: string | null) => void
  setPipelineFilter: (stage: string | null) => void
  updateThread: (id: string, updates: Partial<InboxThread>) => void
}

export const useInboxStore = create<InboxStore>((set) => ({
  threads: [],
  messages: [],
  loading: true,
  activeThread: null,
  channelFilter: null,
  pipelineFilter: null,

  setThreads: (threads) => set({ threads }),
  setMessages: (messages) => set({ messages }),
  setLoading: (loading) => set({ loading }),
  setActiveThread: (id) => set({ activeThread: id }),
  setChannelFilter: (channel) => set({ channelFilter: channel }),
  setPipelineFilter: (stage) => set({ pipelineFilter: stage }),
  updateThread: (id, updates) =>
    set((state) => ({
      threads: state.threads.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
}))
