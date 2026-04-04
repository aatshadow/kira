import { create } from 'zustand'
import type {
  JarvisMessage,
  JarvisConversation,
  JarvisStreamState,
  JarvisModelInfo,
  JarvisSavingsData,
  JarvisServerInfo,
  JarvisToolCall,
  JarvisTokenUsage,
  JarvisTelemetry,
  JarvisManagedAgent,
} from '@/types/jarvis'

// localStorage keys
const CONVERSATIONS_KEY = 'jarvis-conversations'
const SETTINGS_KEY = 'jarvis-settings'

interface ConversationStore {
  version: 1
  conversations: Record<string, JarvisConversation>
  activeId: string | null
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadConversations(): ConversationStore {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY)
    if (!raw) return { version: 1, conversations: {}, activeId: null }
    const parsed = JSON.parse(raw)
    if (parsed.version === 1) return parsed
    return { version: 1, conversations: {}, activeId: null }
  } catch {
    return { version: 1, conversations: {}, activeId: null }
  }
}

function saveConversations(store: ConversationStore): void {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(store))
}

export type JarvisTab = 'chat' | 'dashboard' | 'agents' | 'sources'

interface JarvisSettings {
  temperature: number
  maxTokens: number
  defaultModel: string
}

function loadSettings(): JarvisSettings {
  const defaults: JarvisSettings = { temperature: 0.7, maxTokens: 4096, defaultModel: '' }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaults
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return defaults
  }
}

function saveSettings(s: JarvisSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

const INITIAL_STREAM: JarvisStreamState = {
  isStreaming: false,
  phase: '',
  elapsedMs: 0,
  activeToolCalls: [],
  content: '',
}

interface JarvisState {
  // Tab
  activeTab: JarvisTab

  // Conversations
  conversations: JarvisConversation[]
  activeId: string | null
  messages: JarvisMessage[]
  streamState: JarvisStreamState

  // Models & server
  models: JarvisModelInfo[]
  modelsLoading: boolean
  selectedModel: string
  serverInfo: JarvisServerInfo | null
  serverOnline: boolean
  savings: JarvisSavingsData | null

  // Agents
  agents: JarvisManagedAgent[]

  // Settings
  settings: JarvisSettings

  // Actions: tab
  setActiveTab: (tab: JarvisTab) => void

  // Actions: conversations
  createConversation: (model?: string) => string
  selectConversation: (id: string) => void
  deleteConversation: (id: string) => void
  addMessage: (conversationId: string, message: JarvisMessage) => void
  updateLastAssistant: (
    conversationId: string,
    content: string,
    toolCalls?: JarvisToolCall[],
    usage?: JarvisTokenUsage,
    telemetry?: JarvisTelemetry,
  ) => void
  setStreamState: (state: Partial<JarvisStreamState>) => void
  resetStream: () => void

  // Actions: models & server
  setModels: (models: JarvisModelInfo[]) => void
  setModelsLoading: (loading: boolean) => void
  setSelectedModel: (model: string) => void
  setServerInfo: (info: JarvisServerInfo | null) => void
  setServerOnline: (online: boolean) => void
  setSavings: (data: JarvisSavingsData | null) => void

  // Actions: agents
  setAgents: (agents: JarvisManagedAgent[]) => void

  // Actions: settings
  updateSettings: (partial: Partial<JarvisSettings>) => void
}

export const useJarvisStore = create<JarvisState>((set, get) => {
  const initial = loadConversations()
  const convList = Object.values(initial.conversations).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  )

  return {
    activeTab: 'chat',

    conversations: convList,
    activeId: initial.activeId,
    messages:
      initial.activeId && initial.conversations[initial.activeId]
        ? initial.conversations[initial.activeId].messages
        : [],
    streamState: INITIAL_STREAM,

    models: [],
    modelsLoading: true,
    selectedModel: '',
    serverInfo: null,
    serverOnline: false,
    savings: null,

    agents: [],

    settings: loadSettings(),

    // Tab
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Conversations
    createConversation: (model?: string) => {
      const store = loadConversations()
      const conv: JarvisConversation = {
        id: generateId(),
        title: 'New chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: model || get().selectedModel || 'default',
        messages: [],
      }
      store.conversations[conv.id] = conv
      store.activeId = conv.id
      saveConversations(store)
      set({
        conversations: Object.values(store.conversations).sort(
          (a, b) => b.updatedAt - a.updatedAt,
        ),
        activeId: conv.id,
        messages: [],
      })
      return conv.id
    },

    selectConversation: (id: string) => {
      const store = loadConversations()
      store.activeId = id
      saveConversations(store)
      const conv = store.conversations[id]
      set({ activeId: id, messages: conv ? conv.messages : [] })
    },

    deleteConversation: (id: string) => {
      const store = loadConversations()
      delete store.conversations[id]
      if (store.activeId === id) {
        const remaining = Object.keys(store.conversations)
        store.activeId = remaining.length > 0 ? remaining[0] : null
      }
      saveConversations(store)
      const convList = Object.values(store.conversations).sort(
        (a, b) => b.updatedAt - a.updatedAt,
      )
      const activeConv = store.activeId ? store.conversations[store.activeId] : null
      set({
        conversations: convList,
        activeId: store.activeId,
        messages: activeConv ? activeConv.messages : [],
      })
    },

    addMessage: (conversationId: string, message: JarvisMessage) => {
      const store = loadConversations()
      const conv = store.conversations[conversationId]
      if (!conv) return
      conv.messages.push(message)
      conv.updatedAt = Date.now()
      if (message.role === 'user' && conv.title === 'New chat') {
        conv.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
      }
      saveConversations(store)
      set({
        messages: [...conv.messages],
        conversations: Object.values(store.conversations).sort(
          (a, b) => b.updatedAt - a.updatedAt,
        ),
      })
    },

    updateLastAssistant: (
      conversationId: string,
      content: string,
      toolCalls?: JarvisToolCall[],
      usage?: JarvisTokenUsage,
      telemetry?: JarvisTelemetry,
    ) => {
      const store = loadConversations()
      const conv = store.conversations[conversationId]
      if (!conv) return
      const lastMsg = conv.messages[conv.messages.length - 1]
      if (lastMsg && lastMsg.role === 'assistant') {
        lastMsg.content = content
        if (toolCalls) lastMsg.toolCalls = toolCalls
        if (usage) lastMsg.usage = usage
        if (telemetry) lastMsg.telemetry = telemetry
        conv.updatedAt = Date.now()
        saveConversations(store)
        set({ messages: [...conv.messages] })
      }
    },

    setStreamState: (partial) => {
      set((s) => ({ streamState: { ...s.streamState, ...partial } }))
    },

    resetStream: () => set({ streamState: INITIAL_STREAM }),

    // Models & server
    setModels: (models) => set({ models }),
    setModelsLoading: (loading) => set({ modelsLoading: loading }),
    setSelectedModel: (model) => set({ selectedModel: model }),
    setServerInfo: (info) => set({ serverInfo: info }),
    setServerOnline: (online) => set({ serverOnline: online }),
    setSavings: (data) => set({ savings: data }),

    // Agents
    setAgents: (agents) => set({ agents }),

    // Settings
    updateSettings: (partial) => {
      const updated = { ...get().settings, ...partial }
      saveSettings(updated)
      set({ settings: updated })
    },
  }
})

export { generateId }
