'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Plug, Power, PowerOff, Activity, ChevronRight, ArrowLeft,
  Shield, Eye, Pencil, Trash2, Clock, Zap, AlertTriangle,
  Calendar, Mail, MessageCircle, FileText, Instagram, Linkedin,
  Terminal, Loader2, Settings2, ChevronDown
} from 'lucide-react'
import { fadeUp, staggerContainer, tapBounce } from '@/lib/animations'
import { KiraLogo } from '@/components/shared/KiraLogo'
import { useAgents } from '@/lib/hooks/useAgents'
import { cn } from '@/lib/utils'
import type { Agent, AgentLog } from '@/stores/agentStore'

const AGENT_META: Record<string, { icon: React.ElementType; color: string; gradient: string }> = {
  google_calendar: { icon: Calendar, color: '#4285F4', gradient: 'from-[#4285F4]/20 to-[#4285F4]/5' },
  gmail: { icon: Mail, color: '#EA4335', gradient: 'from-[#EA4335]/20 to-[#EA4335]/5' },
  whatsapp: { icon: MessageCircle, color: '#25D366', gradient: 'from-[#25D366]/20 to-[#25D366]/5' },
  notion: { icon: FileText, color: '#FFFFFF', gradient: 'from-white/10 to-white/3' },
  instagram: { icon: Instagram, color: '#E4405F', gradient: 'from-[#E4405F]/20 to-[#E4405F]/5' },
  linkedin: { icon: Linkedin, color: '#0A66C2', gradient: 'from-[#0A66C2]/20 to-[#0A66C2]/5' },
  terminal: { icon: Terminal, color: '#22C55E', gradient: 'from-[#22C55E]/20 to-[#22C55E]/5' },
}

const STATUS_CONFIG = {
  connected: { label: 'Conectado', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  running: { label: 'Ejecutando', color: 'text-[#00D4FF]', bg: 'bg-[#00D4FF]/10 border-[#00D4FF]/20', dot: 'bg-[#00D4FF]' },
  disconnected: { label: 'Desconectado', color: 'text-muted-foreground', bg: 'bg-white/[0.04] border-white/[0.08]', dot: 'bg-muted-foreground' },
  error: { label: 'Error', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
}

function formatTimeAgo(iso: string | null) {
  if (!iso) return 'Nunca'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.round(mins / 60)}h`
  return `${Math.round(mins / 1440)}d`
}

export function KiraAgents() {
  const { agents, logs, loading, fetchLogs, connectAgent, disconnectAgent, updateAgent } = useAgents()
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [configuring, setConfiguring] = useState<string | null>(null)
  const [connectingId, setConnectingId] = useState<string | null>(null)

  const selectedAgent = agents.find((a) => a.slug === selectedSlug)

  useEffect(() => {
    if (selectedAgent) fetchLogs(selectedAgent.id)
  }, [selectedAgent, fetchLogs])

  const handleToggle = async (agent: Agent) => {
    setConnectingId(agent.id)
    try {
      if (agent.status === 'connected' || agent.status === 'running') {
        await disconnectAgent(agent.id)
      } else {
        await connectAgent(agent.id)
      }
    } finally {
      setConnectingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // --- Agent Detail View ---
  if (selectedAgent) {
    const meta = AGENT_META[selectedAgent.slug] || { icon: Bot, color: '#888', gradient: 'from-white/5 to-white/2' }
    const Icon = meta.icon
    const statusCfg = STATUS_CONFIG[selectedAgent.status]
    const stats = selectedAgent.stats

    return (
      <motion.div
        className="h-full overflow-y-auto"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Back button */}
        <button
          onClick={() => setSelectedSlug(null)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Todos los agentes
        </button>

        {/* Agent header card */}
        <div className="glass-card !rounded-2xl p-5 mb-4">
          <div className="flex items-start gap-4">
            <div
              className={cn('h-14 w-14 rounded-2xl flex items-center justify-center bg-gradient-to-b', meta.gradient)}
            >
              <Icon className="h-7 w-7" style={{ color: meta.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="text-base font-semibold text-foreground">{selectedAgent.name}</h2>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', statusCfg.bg, statusCfg.color)}>
                  <span className="flex items-center gap-1">
                    <motion.span
                      className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)}
                      animate={selectedAgent.status === 'connected' || selectedAgent.status === 'running'
                        ? { scale: [1, 1.3, 1], opacity: [1, 0.5, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    {statusCfg.label}
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{selectedAgent.description}</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <p className="text-lg font-semibold text-foreground tabular-nums">{stats.actions_today}</p>
              <p className="text-[10px] text-muted-foreground">Hoy</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <p className="text-lg font-semibold text-foreground tabular-nums">{stats.actions_total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <p className="text-lg font-semibold text-foreground tabular-nums">
                {selectedAgent.last_heartbeat ? formatTimeAgo(selectedAgent.last_heartbeat) : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground">Ultimo ping</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mb-4">
          <motion.button
            whileTap={tapBounce}
            onClick={() => handleToggle(selectedAgent)}
            disabled={connectingId === selectedAgent.id}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-medium transition-all cursor-pointer',
              selectedAgent.status === 'connected' || selectedAgent.status === 'running'
                ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
            )}
          >
            {connectingId === selectedAgent.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : selectedAgent.status === 'connected' || selectedAgent.status === 'running' ? (
              <><PowerOff className="h-3.5 w-3.5" /> Desconectar</>
            ) : (
              <><Power className="h-3.5 w-3.5" /> Conectar</>
            )}
          </motion.button>
          <motion.button
            whileTap={tapBounce}
            onClick={() => setConfiguring(configuring === selectedAgent.slug ? null : selectedAgent.slug)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-foreground hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Configurar
          </motion.button>
        </div>

        {/* Config panel */}
        <AnimatePresence>
          {configuring === selectedAgent.slug && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <AgentConfigPanel agent={selectedAgent} onUpdate={updateAgent} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Permissions */}
        <div className="glass-card !rounded-2xl p-4 mb-4">
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-[#00D4FF]" />
            Permisos
          </h3>
          <div className="space-y-2">
            {[
              { key: 'read', label: 'Lectura', desc: 'Leer datos y consultar información', icon: Eye },
              { key: 'write', label: 'Escritura', desc: 'Crear y modificar datos', icon: Pencil },
              { key: 'delete', label: 'Eliminación', desc: 'Borrar datos permanentemente', icon: Trash2 },
            ].map((perm) => {
              const PIcon = perm.icon
              const enabled = selectedAgent.permissions[perm.key as keyof typeof selectedAgent.permissions]
              return (
                <div key={perm.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <PIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{perm.label}</p>
                      <p className="text-[10px] text-muted-foreground">{perm.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateAgent(selectedAgent.id, {
                      permissions: { ...selectedAgent.permissions, [perm.key]: !enabled },
                    })}
                    className={cn(
                      'h-6 w-10 rounded-full transition-all cursor-pointer relative',
                      enabled ? 'bg-[#00D4FF]/30' : 'bg-white/[0.06]'
                    )}
                  >
                    <motion.div
                      className={cn('absolute top-0.5 h-5 w-5 rounded-full', enabled ? 'bg-[#00D4FF]' : 'bg-muted-foreground/50')}
                      animate={{ left: enabled ? 18 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity log */}
        <div className="glass-card !rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-[#00D4FF]" />
            Actividad reciente
          </h3>
          {logs.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-4">Sin actividad registrada</p>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-hide">
              {logs.slice(0, 20).map((log) => (
                <LogEntry key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>

        {/* Error display */}
        {selectedAgent.last_error && (
          <div className="mt-3 rounded-2xl bg-red-500/5 border border-red-500/10 p-3 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-red-400">Ultimo error</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{selectedAgent.last_error}</p>
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  // --- Agent Grid View ---
  const connectedCount = agents.filter((a) => a.status === 'connected' || a.status === 'running').length

  return (
    <motion.div
      className="h-full overflow-y-auto"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Centro de Agentes</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {connectedCount} de {agents.length} agentes activos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-emerald-400"
              animate={connectedCount > 0 ? { scale: [1, 1.3, 1], opacity: [1, 0.5, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-[10px] font-medium text-muted-foreground">{connectedCount} online</span>
          </div>
        </div>
      </motion.div>

      {/* KIRA COO banner */}
      <motion.div variants={fadeUp} className="glass-card !rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[rgba(0,212,255,0.08)] flex items-center justify-center shrink-0">
            <KiraLogo size="sm" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-0.5">KIRA orquesta todos los agentes</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Conecta tus herramientas y KIRA las controla por ti. Cada agente tiene permisos configurables y logs de actividad en tiempo real.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Status line — compact summary */}
      <motion.div variants={fadeUp} className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {agents.filter((a) => a.status !== 'disconnected').map((agent) => {
          const meta = AGENT_META[agent.slug] || { icon: Bot, color: '#888' }
          const Icon = meta.icon
          return (
            <button
              key={agent.id}
              onClick={() => setSelectedSlug(agent.slug)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] shrink-0 cursor-pointer hover:bg-white/[0.08] transition-colors"
            >
              <Icon className="h-3 w-3" style={{ color: meta.color }} />
              <span className="text-[10px] font-medium text-foreground">{agent.name.split(' ')[0]}</span>
              <motion.span
                className={cn('h-1.5 w-1.5 rounded-full', STATUS_CONFIG[agent.status].dot)}
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </button>
          )
        })}
      </motion.div>

      {/* Agent grid */}
      <motion.div variants={fadeUp} className="space-y-2">
        {agents.map((agent, i) => {
          const meta = AGENT_META[agent.slug] || { icon: Bot, color: '#888', gradient: 'from-white/5 to-white/2' }
          const Icon = meta.icon
          const statusCfg = STATUS_CONFIG[agent.status]
          const isActive = agent.status === 'connected' || agent.status === 'running'

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card !rounded-2xl p-4 cursor-pointer hover:bg-white/[0.11] transition-colors"
              onClick={() => setSelectedSlug(agent.slug)}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={cn('h-11 w-11 rounded-2xl flex items-center justify-center bg-gradient-to-b shrink-0', meta.gradient)}
                >
                  <Icon className="h-5 w-5" style={{ color: meta.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                    <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border', statusCfg.bg, statusCfg.color)}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{agent.description}</p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {isActive && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Zap className="h-3 w-3" />
                      <span className="tabular-nums">{agent.stats.actions_today}</span>
                    </div>
                  )}

                  {/* Toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggle(agent) }}
                    disabled={connectingId === agent.id}
                    className={cn(
                      'h-7 w-12 rounded-full transition-all cursor-pointer relative',
                      isActive ? 'bg-[#00D4FF]/25' : 'bg-white/[0.06]'
                    )}
                  >
                    {connectingId === agent.id ? (
                      <Loader2 className="h-4 w-4 animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                    ) : (
                      <motion.div
                        className={cn('absolute top-1 h-5 w-5 rounded-full shadow-sm', isActive ? 'bg-[#00D4FF]' : 'bg-muted-foreground/50')}
                        animate={{ left: isActive ? 24 : 4 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>

                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* How it works — compact */}
      <motion.div variants={fadeUp} className="mt-5 glass-card !rounded-2xl p-4">
        <h3 className="text-[11px] font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5 text-[#00D4FF]" />
          Arquitectura
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { step: '1', text: 'Conecta agentes (OAuth o API key)' },
            { step: '2', text: 'KIRA detecta qué agente necesita' },
            { step: '3', text: 'Ejecuta acciones y reporta' },
            { step: '4', text: 'Monitoriza todo en tiempo real' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-[rgba(0,212,255,0.1)] flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-[#00D4FF]">{item.step}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// --- Sub-components ---

function AgentConfigPanel({ agent, onUpdate }: { agent: Agent; onUpdate: (id: string, u: Partial<Agent>) => Promise<Agent | null> }) {
  const [apiKey, setApiKey] = useState((agent.config as Record<string, string>).api_key || '')
  const [webhook, setWebhook] = useState((agent.config as Record<string, string>).webhook_url || '')
  const [saving, setSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const config = { ...agent.config, api_key: apiKey || undefined, webhook_url: webhook || undefined }
    await onUpdate(agent.id, { config })
    setSaving(false)
  }

  return (
    <div className="glass-card !rounded-2xl p-4 space-y-3">
      <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <Settings2 className="h-3.5 w-3.5 text-[#00D4FF]" />
        Configuración — {agent.name}
      </h3>

      {/* API Key */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">API Key / Token</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={`API key de ${agent.name}...`}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#00D4FF]/30 transition-colors"
        />
      </div>

      {/* Webhook URL */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Webhook URL (opcional)</label>
        <input
          type="url"
          value={webhook}
          onChange={(e) => setWebhook(e.target.value)}
          placeholder="https://..."
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#00D4FF]/30 transition-colors"
        />
      </div>

      {/* Advanced */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ChevronDown className={cn('h-3 w-3 transition-transform', showAdvanced && 'rotate-180')} />
        Avanzado
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Intervalo de sync (minutos)</label>
              <input
                type="number"
                defaultValue={5}
                min={1}
                max={60}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-[#00D4FF]/30 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Max acciones / hora</label>
              <input
                type="number"
                defaultValue={100}
                min={1}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-[#00D4FF]/30 transition-colors"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={tapBounce}
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 rounded-xl text-xs font-medium bg-[#00D4FF] text-black hover:bg-[#00A8CC] disabled:opacity-50 transition-colors cursor-pointer"
      >
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </motion.button>
    </div>
  )
}

function LogEntry({ log }: { log: AgentLog }) {
  return (
    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className={cn(
        'h-1.5 w-1.5 rounded-full shrink-0',
        log.status === 'success' ? 'bg-emerald-400' : log.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-foreground truncate">{log.action}</p>
        {log.error && <p className="text-[10px] text-red-400 truncate">{log.error}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {log.duration_ms && (
          <span className="text-[9px] text-muted-foreground/50 tabular-nums">{log.duration_ms}ms</span>
        )}
        <span className="text-[9px] text-muted-foreground/50">
          <Clock className="h-2.5 w-2.5 inline mr-0.5" />
          {formatTimeAgo(log.created_at)}
        </span>
      </div>
    </div>
  )
}
