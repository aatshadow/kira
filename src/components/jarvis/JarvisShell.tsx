'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, BarChart3, Bot, Database } from 'lucide-react'
import { useJarvisStore, type JarvisTab } from '@/stores/jarvisStore'
import { checkJarvisHealth, fetchJarvisModels, fetchJarvisInfo } from '@/lib/jarvis/api'
import { JarvisChatArea } from './chat/JarvisChatArea'
import { JarvisDashboard } from './dashboard/JarvisDashboard'
import { JarvisAgents } from './agents/JarvisAgents'
import { JarvisSources } from './JarvisSources'
import { cn } from '@/lib/utils'

const tabs: { id: JarvisTab; label: string; icon: React.ReactNode }[] = [
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={14} /> },
  { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={14} /> },
  { id: 'agents', label: 'Agents', icon: <Bot size={14} /> },
  { id: 'sources', label: 'Sources', icon: <Database size={14} /> },
]

export function JarvisShell() {
  const activeTab = useJarvisStore((s) => s.activeTab)
  const setActiveTab = useJarvisStore((s) => s.setActiveTab)
  const setServerOnline = useJarvisStore((s) => s.setServerOnline)
  const setModels = useJarvisStore((s) => s.setModels)
  const setModelsLoading = useJarvisStore((s) => s.setModelsLoading)
  const setSelectedModel = useJarvisStore((s) => s.setSelectedModel)
  const selectedModel = useJarvisStore((s) => s.selectedModel)
  const setServerInfo = useJarvisStore((s) => s.setServerInfo)

  // Init: health check, models, server info
  useEffect(() => {
    checkJarvisHealth().then(setServerOnline)

    fetchJarvisModels()
      .then((m) => {
        setModels(m)
        if (!selectedModel && m.length > 0) setSelectedModel(m[0].id)
      })
      .catch(() => setModels([]))
      .finally(() => setModelsLoading(false))

    fetchJarvisInfo().then(setServerInfo)

    // Poll health every 15s
    const interval = setInterval(() => {
      checkJarvisHealth().then(setServerOnline)
    }, 15000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-2 pb-0 shrink-0">
        <div className="flex items-center gap-0.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] tracking-wide transition-colors cursor-pointer',
                  isActive ? 'text-[#00D4FF]' : 'text-muted-foreground hover:text-foreground/70',
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="jarvis-tab"
                    className="absolute inset-0 rounded-lg bg-[#00D4FF]/8 border border-[#00D4FF]/15"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Model selector */}
        {activeTab === 'chat' && (
          <div className="ml-auto">
            <ModelSelector />
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <JarvisChatArea />}
        {activeTab === 'dashboard' && <JarvisDashboard />}
        {activeTab === 'agents' && <JarvisAgents />}
        {activeTab === 'sources' && <JarvisSources />}
      </div>
    </div>
  )
}

function ModelSelector() {
  const models = useJarvisStore((s) => s.models)
  const selectedModel = useJarvisStore((s) => s.selectedModel)
  const setSelectedModel = useJarvisStore((s) => s.setSelectedModel)
  const modelsLoading = useJarvisStore((s) => s.modelsLoading)

  if (modelsLoading) {
    return <span className="text-[10px] text-muted-foreground/40">Loading models...</span>
  }

  if (models.length === 0) {
    return <span className="text-[10px] text-muted-foreground/40">No models</span>
  }

  return (
    <select
      value={selectedModel}
      onChange={(e) => setSelectedModel(e.target.value)}
      className="text-[11px] bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-muted-foreground outline-none focus:border-[#00D4FF]/30 cursor-pointer"
    >
      {models.map((m) => (
        <option key={m.id} value={m.id}>{m.id}</option>
      ))}
    </select>
  )
}
