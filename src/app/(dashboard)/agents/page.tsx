'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Bot, CheckCircle2, AlertCircle, Clock, Play,
  RefreshCw, Loader2, ChevronRight, Mail, MessageSquare,
  Calendar, Instagram, Brain, Zap, HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface AgentLog {
  id: string
  agent_id: string | null
  action: string
  status: 'success' | 'error' | 'pending'
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  error: string | null
  duration_ms: number | null
  created_at: string
}

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  read: boolean
  created_at: string
}

interface ActivityData {
  logs: AgentLog[]
  notifications: Notification[]
  runningTasks: Array<Record<string, unknown>>
  stats: { total: number; success: number; errors: number; pending: number }
  agentActivity: Record<string, { actions: number; lastAction: string; lastTime: string; status: string }>
}

const AGENT_META: Record<string, { icon: typeof Bot; color: string; label: string }> = {
  'Inbox Monitor': { icon: Mail, color: '#00D4FF', label: 'Inbox Monitor' },
  'Calendar Prep': { icon: Calendar, color: '#A78BFA', label: 'Calendar Prep' },
  'Self-Improver': { icon: Brain, color: '#F59E0B', label: 'Self-Improver' },
  'KIRA': { icon: Bot, color: '#00D4FF', label: 'KIRA Core' },
  'ManyChat': { icon: Instagram, color: '#E879F9', label: 'Instagram' },
}

const STATUS_CONFIG = {
  success: { icon: CheckCircle2, color: '#10B981', label: 'Completado' },
  error: { icon: AlertCircle, color: '#EF4444', label: 'Error' },
  pending: { icon: HelpCircle, color: '#F59E0B', label: 'Pendiente' },
}

export default function AgentsPage() {
  const [data, setData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/activity?limit=100')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  // Initial fetch + auto-refresh every 30s
  useEffect(() => {
    fetchActivity()
    if (!autoRefresh) return
    const interval = setInterval(fetchActivity, 30000)
    return () => clearInterval(interval)
  }, [fetchActivity, autoRefresh])

  const triggerLoop = async () => {
    setRunning(true)
    try {
      const res = await fetch('/api/agents/activity', { method: 'POST' })
      const json = await res.json()
      if (json.ok) {
        // Refresh data after loop
        await fetchActivity()
      }
    } catch { /* ignore */ }
    finally { setRunning(false) }
  }

  const agents = data?.agentActivity || {}
  const logs = data?.logs || []
  const notifications = data?.notifications || []
  const stats = data?.stats || { total: 0, success: 0, errors: 0, pending: 0 }

  const filteredLogs = selectedAgent
    ? logs.filter(l => l.action?.startsWith(selectedAgent + ':'))
    : logs

  const pendingQuestions = notifications.filter(n =>
    !n.read && n.data && (n.data as Record<string, unknown>).source === 'autonomous_loop'
  )

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-6 flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="h-6 w-6 text-[#00D4FF] animate-spin" />
          <span className="text-sm text-muted-foreground">Cargando actividad...</span>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Agent Activity</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time monitoring del loop autónomo de KIRA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-medium transition-all',
              autoRefresh
                ? 'bg-[rgba(0,212,255,0.08)] text-[#00D4FF] border border-[rgba(0,212,255,0.2)]'
                : 'bg-white/[0.03] text-muted-foreground border border-white/[0.06]'
            )}
          >
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={triggerLoop}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.1)] text-[#00D4FF] border border-[rgba(0,212,255,0.2)] text-xs font-medium disabled:opacity-50 transition-all hover:bg-[rgba(0,212,255,0.15)] cursor-pointer"
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {running ? 'Ejecutando...' : 'Run Loop'}
          </motion.button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total acciones"
          value={stats.total}
          icon={Activity}
          color="#00D4FF"
        />
        <StatCard
          label="Completadas"
          value={stats.success}
          icon={CheckCircle2}
          color="#10B981"
        />
        <StatCard
          label="Errores"
          value={stats.errors}
          icon={AlertCircle}
          color="#EF4444"
        />
        <StatCard
          label="Pendientes"
          value={stats.pending}
          icon={HelpCircle}
          color="#F59E0B"
        />
      </div>

      {/* Agent Cards */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Agentes activos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(agents).length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center gap-2">
              <Bot className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Ningún agente ha ejecutado acciones aún
              </p>
              <p className="text-xs text-muted-foreground/60">
                Pulsa &ldquo;Run Loop&rdquo; para ejecutar el ciclo autónomo
              </p>
            </div>
          ) : (
            Object.entries(agents).map(([name, info]) => {
              const meta = AGENT_META[name] || { icon: Bot, color: '#6B7280', label: name }
              const Icon = meta.icon
              const isSelected = selectedAgent === name

              return (
                <motion.button
                  key={name}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedAgent(isSelected ? null : name)}
                  className={cn(
                    'p-4 rounded-xl text-left transition-all cursor-pointer',
                    'bg-white/[0.02] border hover:bg-white/[0.04]',
                    isSelected
                      ? 'border-[rgba(0,212,255,0.3)] bg-[rgba(0,212,255,0.04)]'
                      : 'border-white/[0.06]'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${meta.color}15` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: meta.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{meta.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {info.actions} accion{info.actions !== 1 ? 'es' : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className="h-2 w-2 rounded-full mt-1"
                      style={{
                        backgroundColor: info.status === 'success' ? '#10B981' : info.status === 'error' ? '#EF4444' : '#F59E0B',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-2">
                    Última: {info.lastAction} · {formatDistanceToNow(new Date(info.lastTime), { addSuffix: true, locale: es })}
                  </p>
                </motion.button>
              )
            })
          )}
        </div>
      </div>

      {/* Pending Questions from KIRA */}
      {pendingQuestions.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-[#F59E0B] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            KIRA necesita tu input ({pendingQuestions.length})
          </h2>
          <div className="space-y-2">
            {pendingQuestions.map(q => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)]"
              >
                <p className="text-sm text-foreground">{q.body}</p>
                {q.data && (q.data as Record<string, string>).context && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Contexto: {(q.data as Record<string, string>).context}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                  {formatDistanceToNow(new Date(q.created_at), { addSuffix: true, locale: es })}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {selectedAgent ? `Actividad de ${selectedAgent}` : 'Toda la actividad'}
          </h2>
          {selectedAgent && (
            <button
              onClick={() => setSelectedAgent(null)}
              className="text-[10px] text-[#00D4FF] hover:underline cursor-pointer"
            >
              Ver todo
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {filteredLogs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 flex flex-col items-center gap-2"
              >
                <Activity className="h-6 w-6 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Sin actividad registrada</p>
              </motion.div>
            ) : (
              filteredLogs.map((log, i) => {
                const agentName = log.action?.split(':')[0] || 'Unknown'
                const actionName = log.action?.split(':')[1] || log.action
                const meta = AGENT_META[agentName] || { icon: Bot, color: '#6B7280', label: agentName }
                const statusCfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending
                const StatusIcon = statusCfg.icon
                const description = (log.input as Record<string, string>)?.description || actionName

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                  >
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: `${meta.color}12` }}
                    >
                      <meta.icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{meta.label}</span>
                        <StatusIcon className="h-3 w-3 shrink-0" style={{ color: statusCfg.color }} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {description}
                      </p>
                      {log.output && (log.output as Record<string, string>).details && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1 whitespace-pre-line line-clamp-3">
                          {(log.output as Record<string, string>).details}
                        </p>
                      )}
                      {log.error && (
                        <p className="text-[10px] text-red-400/80 mt-1">{log.error}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground/50">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                      </p>
                      {log.duration_ms && (
                        <p className="text-[9px] text-muted-foreground/30 mt-0.5">
                          {log.duration_ms}ms
                        </p>
                      )}
                    </div>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: typeof Activity; color: string
}) {
  return (
    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="h-6 w-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${color}12` }}
        >
          <Icon className="h-3 w-3" style={{ color }} />
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  )
}
