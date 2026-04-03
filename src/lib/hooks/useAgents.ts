'use client'

import { useEffect, useCallback } from 'react'
import { useAgentStore, type Agent } from '@/stores/agentStore'

export function useAgents() {
  const { agents, logs, loading, setAgents, setLogs, setLoading } = useAgentStore()

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents')
      if (res.ok) {
        const data = await res.json()
        setAgents(data.agents || [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [setAgents, setLoading])

  const fetchLogs = useCallback(async (agentId?: string) => {
    try {
      const url = agentId ? `/api/agents/logs?agent_id=${agentId}` : '/api/agents/logs'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch { /* ignore */ }
  }, [setLogs])

  const updateAgent = useCallback(async (id: string, updates: Partial<Agent>) => {
    try {
      const res = await fetch('/api/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      if (res.ok) {
        const data = await res.json()
        useAgentStore.getState().updateAgent(id, data.agent)
        return data.agent
      }
    } catch { /* ignore */ }
    return null
  }, [])

  const connectAgent = useCallback(async (id: string, config?: Record<string, unknown>) => {
    return updateAgent(id, {
      status: 'connected',
      ...(config ? { config } : {}),
    })
  }, [updateAgent])

  const disconnectAgent = useCallback(async (id: string) => {
    return updateAgent(id, { status: 'disconnected' })
  }, [updateAgent])

  const executeAction = useCallback(async (agentSlug: string, action: string, params?: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_slug: agentSlug, action, params: params || {} }),
      })
      return await res.json()
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Unknown error' }
    }
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  return {
    agents,
    logs,
    loading,
    fetchAgents,
    fetchLogs,
    updateAgent,
    connectAgent,
    disconnectAgent,
    executeAction,
  }
}
