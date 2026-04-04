'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Database, Check, Loader2, RefreshCw, Mail, MessageSquare, FileText, Cloud } from 'lucide-react'

interface ConnectorInfo {
  id: string
  name: string
  connected: boolean
  document_count?: number
  last_sync?: string
}

const sourceIcons: Record<string, React.ReactNode> = {
  gmail: <Mail size={16} />,
  slack: <MessageSquare size={16} />,
  imessage: <MessageSquare size={16} />,
  notion: <FileText size={16} />,
  obsidian: <FileText size={16} />,
  gdrive: <Cloud size={16} />,
}

export function JarvisSources() {
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/jarvis/connectors')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setConnectors(Array.isArray(data) ? data : data.connectors || []))
      .catch(() => setConnectors([]))
      .finally(() => setLoading(false))
  }, [])

  const handleConnect = async (id: string) => {
    await fetch(`/api/jarvis/connectors/${id}/connect`, { method: 'POST' })
    const res = await fetch('/api/jarvis/connectors')
    const data = await res.json()
    setConnectors(Array.isArray(data) ? data : data.connectors || [])
  }

  const handleSync = async (id: string) => {
    setSyncing(id)
    await fetch(`/api/jarvis/connectors/${id}/sync`, { method: 'POST' })
    setSyncing(null)
    const res = await fetch('/api/jarvis/connectors')
    const data = await res.json()
    setConnectors(Array.isArray(data) ? data : data.connectors || [])
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Data Sources</h2>
        <p className="text-xs text-muted-foreground">Connect your data for personalized AI</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#00D4FF]" />
        </div>
      ) : connectors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Database size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No data sources available</p>
          <p className="text-xs opacity-60 mt-1">Start the Jarvis backend to see available connectors</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {connectors.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-white/[0.06] p-4 bg-white/[0.02] hover:border-white/[0.1] transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-[#00D4FF]">
                  {sourceIcons[c.id] || <Database size={16} />}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-foreground">{c.name}</h3>
                  {c.document_count != null && (
                    <span className="text-[10px] text-muted-foreground">{c.document_count} docs</span>
                  )}
                </div>
                {c.connected && <Check size={14} className="text-emerald-400" />}
              </div>

              <div className="flex items-center gap-2">
                {c.connected ? (
                  <button
                    onClick={() => handleSync(c.id)}
                    disabled={syncing === c.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] bg-white/[0.04] text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {syncing === c.id ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                    Sync
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(c.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] bg-[#00D4FF]/10 text-[#00D4FF] hover:bg-[#00D4FF]/20 transition-colors cursor-pointer"
                  >
                    Connect
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
