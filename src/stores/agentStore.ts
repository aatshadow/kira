import { create } from 'zustand'

export interface Agent {
  id: string
  user_id: string
  slug: string
  name: string
  description: string | null
  status: 'connected' | 'disconnected' | 'error' | 'running'
  config: Record<string, unknown>
  permissions: { read: boolean; write: boolean; delete: boolean }
  schedule: Record<string, unknown>
  last_heartbeat: string | null
  last_error: string | null
  stats: { actions_today: number; actions_total: number; uptime_hours: number }
  created_at: string
  updated_at: string
}

export interface AgentLog {
  id: string
  agent_id: string
  action: string
  status: 'success' | 'error' | 'pending'
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  error: string | null
  duration_ms: number | null
  created_at: string
}

interface AgentStore {
  agents: Agent[]
  logs: AgentLog[]
  loading: boolean
  selectedAgent: string | null

  setAgents: (agents: Agent[]) => void
  setLogs: (logs: AgentLog[]) => void
  setLoading: (loading: boolean) => void
  setSelectedAgent: (slug: string | null) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: [],
  logs: [],
  loading: true,
  selectedAgent: null,

  setAgents: (agents) => set({ agents }),
  setLogs: (logs) => set({ logs }),
  setLoading: (loading) => set({ loading }),
  setSelectedAgent: (slug) => set({ selectedAgent: slug }),
  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
}))
