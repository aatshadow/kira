'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Play, Pause, Trash2, Plus, RefreshCw, Clock, DollarSign } from 'lucide-react'
import { useJarvisStore } from '@/stores/jarvisStore'
import { fetchJarvisAgents } from '@/lib/jarvis/api'
import type { JarvisManagedAgent } from '@/types/jarvis'

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  idle: { bg: 'bg-white/[0.04]', text: 'text-muted-foreground', dot: 'bg-gray-400' },
  running: { bg: 'bg-[#00D4FF]/5', text: 'text-[#00D4FF]', dot: 'bg-[#00D4FF]' },
  paused: { bg: 'bg-yellow-500/5', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  error: { bg: 'bg-red-500/5', text: 'text-red-400', dot: 'bg-red-400' },
  archived: { bg: 'bg-white/[0.02]', text: 'text-muted-foreground/50', dot: 'bg-gray-600' },
}

function AgentCard({ agent }: { agent: JarvisManagedAgent }) {
  const colors = statusColors[agent.status] || statusColors.idle

  const handleAction = async (action: 'run' | 'pause' | 'resume' | 'delete') => {
    const endpoint = action === 'delete'
      ? `/api/jarvis/agents/${agent.id}`
      : `/api/jarvis/agents/${agent.id}/${action}`
    await fetch(endpoint, { method: action === 'delete' ? 'DELETE' : 'POST' })
    const agents = await fetchJarvisAgents()
    useJarvisStore.getState().setAgents(agents)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-xl border border-white/[0.06] p-4 ${colors.bg} hover:border-white/[0.1] transition-colors`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
            <Bot size={16} className="text-[#00D4FF]" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">{agent.name}</h3>
            <span className="text-[10px] text-muted-foreground">{agent.agent_type}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          <span className={`text-[10px] capitalize ${colors.text}`}>{agent.status}</span>
        </div>
      </div>

      {agent.current_activity && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{agent.current_activity}</p>
      )}

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60 mb-3">
        {agent.total_runs != null && (
          <span className="flex items-center gap-1"><RefreshCw size={10} />{agent.total_runs} runs</span>
        )}
        {agent.total_cost != null && (
          <span className="flex items-center gap-1"><DollarSign size={10} />${agent.total_cost.toFixed(4)}</span>
        )}
        {agent.last_run_at && (
          <span className="flex items-center gap-1"><Clock size={10} />{new Date(agent.last_run_at * 1000).toLocaleDateString()}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {agent.status === 'idle' || agent.status === 'paused' ? (
          <button
            onClick={() => handleAction(agent.status === 'paused' ? 'resume' : 'run')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] bg-[#00D4FF]/10 text-[#00D4FF] hover:bg-[#00D4FF]/20 transition-colors cursor-pointer"
          >
            <Play size={10} /> {agent.status === 'paused' ? 'Resume' : 'Run'}
          </button>
        ) : agent.status === 'running' ? (
          <button
            onClick={() => handleAction('pause')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors cursor-pointer"
          >
            <Pause size={10} /> Pause
          </button>
        ) : null}
        <button
          onClick={() => handleAction('delete')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] bg-white/[0.04] text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer ml-auto"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </motion.div>
  )
}

export function JarvisAgents() {
  const agents = useJarvisStore((s) => s.agents)
  const setAgents = useJarvisStore((s) => s.setAgents)

  useEffect(() => {
    fetchJarvisAgents().then(setAgents).catch(() => {})
  }, [setAgents])

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Agents</h2>
          <p className="text-xs text-muted-foreground">Managed autonomous agents</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-[#00D4FF]/10 text-[#00D4FF] hover:bg-[#00D4FF]/20 transition-colors cursor-pointer border border-[#00D4FF]/20">
          <Plus size={14} /> New Agent
        </button>
      </div>

      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Bot size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No agents yet</p>
          <p className="text-xs opacity-60 mt-1">Create an agent to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence>
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
