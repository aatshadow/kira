'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, HardDrive, MessageCircle, Mail, FileText, RefreshCw,
  Check, X, Loader2, Plug, Globe, Code, Brain, Monitor, Key,
  ExternalLink, Copy, Eye, EyeOff, ChevronDown, ChevronUp, Shield, Cpu
} from 'lucide-react'
import { fadeUp, staggerContainer } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface IntegrationStatus {
  google_calendar: { connected: boolean; last_sync: string | null }
  google_drive: { connected: boolean }
  gmail: { connected: boolean }
  brave_search: { connected: boolean; updated_at: string | null }
  e2b: { connected: boolean; updated_at: string | null }
  anthropic: { connected: boolean; updated_at: string | null }
  mac_daemon: { connected: boolean; capabilities: Record<string, boolean> | null }
  whatsapp: { connected: boolean }
  notion: { connected: boolean }
}

interface SavedKey {
  service: string
  masked_key: string
  has_key: boolean
  is_valid: boolean
  updated_at: string | null
}

interface IntegrationConfig {
  id: string
  name: string
  desc: string
  icon: typeof Globe
  color: string
  category: 'ai' | 'search' | 'code' | 'google' | 'comms' | 'infra'
  requiresKey?: boolean
  keyService?: string
  keyPlaceholder?: string
  autoExpandWhenDisconnected?: boolean
  setupGuide: {
    steps: string[]
    url: string
    urlLabel: string
    notes?: string
    pricing?: string
    terminalCommand?: string
  }
}

const INTEGRATIONS: IntegrationConfig[] = [
  // --- AI ---
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    desc: 'Motor de IA principal de KIRA. Claude Sonnet 4 para chat, Haiku para tareas rápidas.',
    icon: Brain,
    color: '#D97706',
    category: 'ai',
    requiresKey: true,
    keyService: 'anthropic',
    keyPlaceholder: 'sk-ant-api03-...',
    setupGuide: {
      steps: [
        'Ve a console.anthropic.com y crea una cuenta',
        'En "API Keys", haz clic en "Create Key"',
        'Copia la key (empieza con sk-ant-)',
        'Pégala aquí abajo',
      ],
      url: 'https://console.anthropic.com/settings/keys',
      urlLabel: 'Anthropic Console',
      pricing: 'Pay-as-you-go: ~$3/M input tokens (Sonnet), ~$0.25/M (Haiku)',
      notes: 'Si ya tienes la key en .env.local como ANTHROPIC_API_KEY, no necesitas ponerla aquí.',
    },
  },
  // --- Search ---
  {
    id: 'brave_search',
    name: 'Brave Search',
    desc: 'Búsqueda web en tiempo real. Cuando preguntas a KIRA sobre noticias, tiempo, precios, etc.',
    icon: Globe,
    color: '#FB542B',
    category: 'search',
    requiresKey: true,
    keyService: 'brave_search',
    keyPlaceholder: 'BSA...',
    setupGuide: {
      steps: [
        'Ve a api.search.brave.com y regístrate',
        'En el dashboard, crea un nuevo "Subscription"',
        'Selecciona el plan "Free" (2,000 queries/mes)',
        'Copia el API key',
        'Pégalo aquí abajo',
      ],
      url: 'https://api.search.brave.com/register',
      urlLabel: 'Brave Search API',
      pricing: 'Free: 2,000 queries/mes. Pro: $5/mes por 20,000 queries.',
    },
  },
  // --- Code Execution ---
  {
    id: 'e2b',
    name: 'e2b (Code Sandbox)',
    desc: 'Ejecución segura de código Python y JavaScript. KIRA puede ejecutar código cuando se lo pides.',
    icon: Code,
    color: '#10B981',
    category: 'code',
    requiresKey: true,
    keyService: 'e2b',
    keyPlaceholder: 'e2b_...',
    setupGuide: {
      steps: [
        'Ve a e2b.dev y crea una cuenta (GitHub login)',
        'En el Dashboard, ve a "API Keys"',
        'Haz clic en "Create API Key"',
        'Copia la key',
        'Pégala aquí abajo',
      ],
      url: 'https://e2b.dev/dashboard',
      urlLabel: 'e2b Dashboard',
      pricing: 'Free: 100 horas/mes de sandbox. Hobby: $30/mes.',
      notes: 'Cada ejecución de código crea un sandbox temporal que se destruye al terminar.',
    },
  },
  // --- Google Services ---
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    desc: 'Sincroniza eventos, crea reuniones, detecta conflictos. KIRA ve tu calendario de los próximos 7 días.',
    icon: Calendar,
    color: '#4285F4',
    category: 'google',
    setupGuide: {
      steps: [
        'Ve a Google Cloud Console → APIs & Services → Credentials',
        'Crea un "OAuth 2.0 Client ID" (tipo Web Application)',
        'Añade redirect URI: https://tu-proyecto.supabase.co/auth/v1/callback',
        'Copia Client ID y Client Secret a .env.local:',
        '  GOOGLE_CLIENT_ID=tu-client-id',
        '  GOOGLE_CLIENT_SECRET=tu-client-secret',
        'Habilita estas APIs en la consola:',
        '  • Google Calendar API',
        '  • Google Drive API',
        '  • Gmail API',
        'En Supabase → Auth → Providers → Google, activa y pega Client ID/Secret',
        'Haz login con Google en KIRA',
      ],
      url: 'https://console.cloud.google.com/apis/credentials',
      urlLabel: 'Google Cloud Console',
      pricing: 'Gratis (límites generosos para uso personal).',
      notes: 'Un solo OAuth cubre Calendar, Drive, y Gmail. El login con Google activa las tres.',
    },
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    desc: 'Acceso a transcripciones de Google Meet guardadas en Drive.',
    icon: HardDrive,
    color: '#4285F4',
    category: 'google',
    setupGuide: {
      steps: [
        'Se activa automáticamente con el login de Google Calendar',
        'Asegúrate de que "Google Drive API" esté habilitada en tu proyecto',
      ],
      url: 'https://console.cloud.google.com/apis/library/drive.googleapis.com',
      urlLabel: 'Habilitar Drive API',
      pricing: 'Gratis.',
    },
  },
  {
    id: 'gmail',
    name: 'Gmail',
    desc: 'KIRA revisa tu correo cada 15 min, detecta emails urgentes y te notifica.',
    icon: Mail,
    color: '#EA4335',
    category: 'google',
    setupGuide: {
      steps: [
        'Se activa automáticamente con el login de Google',
        'Asegúrate de que "Gmail API" esté habilitada en tu proyecto',
        'Añade el scope de Gmail en tu Supabase provider config:',
        '  https://www.googleapis.com/auth/gmail.readonly',
      ],
      url: 'https://console.cloud.google.com/apis/library/gmail.googleapis.com',
      urlLabel: 'Habilitar Gmail API',
      pricing: 'Gratis.',
      notes: 'Solo lectura — KIRA no envía ni modifica emails. Los cron jobs revisan cada 15 min.',
    },
  },
  // --- Infrastructure ---
  {
    id: 'mac_daemon',
    name: 'Mac Daemon (Terminal)',
    desc: 'Tu Mac ejecuta tareas pesadas (scraping, código largo, modelos locales). KIRA detecta cuando está online.',
    icon: Monitor,
    color: '#6366F1',
    category: 'infra',
    requiresKey: true,
    keyService: 'mac_daemon',
    keyPlaceholder: 'kira-mac-secret-...',
    autoExpandWhenDisconnected: true,
    setupGuide: {
      steps: [
        'Añade estas variables a tu .env.local:',
        '  MAC_DAEMON_SECRET=kira-mac-secret-cambiame',
        '  KIRA_USER_ID=tu-uuid-de-supabase',
        'El secret de arriba debe coincidir con el que pongas en el input de esta página',
        'Tu KIRA_USER_ID lo encuentras en Supabase → Authentication → Users',
        'Abre una terminal y ejecuta el daemon:',
      ],
      terminalCommand: 'cd /Users/alex/KIRA/kira && npx tsx scripts/kira-daemon.ts',
      url: '',
      urlLabel: '',
      pricing: 'Gratis — corre en tu Mac.',
      notes: 'El daemon envía heartbeat cada 30s. Cuando cierras la terminal, las tareas se encolan hasta que vuelvas a conectarte.',
    },
  },
  // --- Planned ---
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    desc: 'Mensajes, seguimiento de conversaciones y notificaciones.',
    icon: MessageCircle,
    color: '#25D366',
    category: 'comms',
    setupGuide: {
      steps: [
        'Próximamente — integración via WhatsApp Business API o MCP bridge',
      ],
      url: '',
      urlLabel: '',
      notes: 'Ya hay un MCP de WhatsApp conectado a KIRA. La integración directa está en desarrollo.',
    },
  },
  {
    id: 'notion',
    name: 'Notion',
    desc: 'Sincroniza bases de datos, notas y documentos.',
    icon: FileText,
    color: '#000',
    category: 'comms',
    setupGuide: {
      steps: [
        'Próximamente — integración via Notion API o MCP bridge',
      ],
      url: '',
      urlLabel: '',
      notes: 'Ya hay un MCP de Notion conectado a KIRA. La integración directa está en desarrollo.',
    },
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  ai: 'Inteligencia Artificial',
  search: 'Búsqueda Web',
  code: 'Ejecución de Código',
  google: 'Google (OAuth)',
  infra: 'Infraestructura',
  comms: 'Comunicación',
}

const CATEGORY_ORDER = ['ai', 'search', 'code', 'google', 'infra', 'comms']

export function IntegrationsSettings() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [fetchingTranscripts, setFetchingTranscripts] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [transcriptResult, setTranscriptResult] = useState<string | null>(null)
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null)
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({})
  const [keyVisible, setKeyVisible] = useState<Record<string, boolean>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [keyMessages, setKeyMessages] = useState<Record<string, { ok: boolean; text: string }>>({})
  const [verifying, setVerifying] = useState<string | null>(null)
  const [verifyResults, setVerifyResults] = useState<Record<string, { ok: boolean; message: string; details?: string }>>({})

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, keysRes] = await Promise.all([
        fetch('/api/integrations/status'),
        fetch('/api/integrations/keys'),
      ])
      if (statusRes.ok) setStatus(await statusRes.json())
      if (keysRes.ok) {
        const data = await keysRes.json()
        setSavedKeys(data.keys || [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleSync = async () => {
    setSyncing(true); setSyncResult(null)
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      const data = await res.json()
      setSyncResult(data.skipped ? 'Sync reciente — espera 2 min' : `${data.synced} nuevos, ${data.updated} actualizados`)
      fetchStatus()
    } catch { setSyncResult('Error al sincronizar') }
    finally { setSyncing(false) }
  }

  const handleTranscripts = async () => {
    setFetchingTranscripts(true); setTranscriptResult(null)
    try {
      const res = await fetch('/api/calendar/transcripts', { method: 'POST' })
      const data = await res.json()
      setTranscriptResult(`${data.found} transcripciones de ${data.processed} meetings`)
    } catch { setTranscriptResult('Error') }
    finally { setFetchingTranscripts(false) }
  }

  const saveApiKey = async (service: string) => {
    const key = keyInputs[service]?.trim()
    if (!key) return

    setSavingKey(service)
    setKeyMessages(prev => ({ ...prev, [service]: undefined as unknown as { ok: boolean; text: string } }))

    try {
      const res = await fetch('/api/integrations/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, api_key: key }),
      })
      const data = await res.json()
      setKeyMessages(prev => ({
        ...prev,
        [service]: { ok: data.valid, text: data.message || (data.valid ? 'Conectado' : 'Error') },
      }))
      setKeyInputs(prev => ({ ...prev, [service]: '' }))
      fetchStatus()
    } catch {
      setKeyMessages(prev => ({ ...prev, [service]: { ok: false, text: 'Error de conexión' } }))
    } finally {
      setSavingKey(null)
    }
  }

  const deleteApiKey = async (service: string) => {
    try {
      await fetch('/api/integrations/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      })
      setKeyMessages(prev => ({ ...prev, [service]: { ok: true, text: 'Key eliminada' } }))
      fetchStatus()
    } catch { /* ignore */ }
  }

  const verifyConnection = async (service: string) => {
    setVerifying(service)
    setVerifyResults(prev => ({ ...prev, [service]: undefined as unknown as { ok: boolean; message: string; details?: string } }))
    try {
      const res = await fetch('/api/integrations/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      })
      const data = await res.json()
      setVerifyResults(prev => ({ ...prev, [service]: data }))
      fetchStatus()
    } catch {
      setVerifyResults(prev => ({ ...prev, [service]: { ok: false, message: 'Error de red' } }))
    } finally {
      setVerifying(null)
    }
  }

  const isConnected = (id: string): boolean => {
    if (!status) return false
    const s = status[id as keyof IntegrationStatus]
    if (!s) return false
    if (typeof s === 'object' && 'connected' in s) return s.connected
    return false
  }

  const formatLastSync = (iso: string | null) => {
    if (!iso) return 'Nunca'
    const d = new Date(iso)
    const diffMin = Math.round((Date.now() - d.getTime()) / 60000)
    if (diffMin < 1) return 'Ahora mismo'
    if (diffMin < 60) return `Hace ${diffMin} min`
    if (diffMin < 1440) return `Hace ${Math.round(diffMin / 60)}h`
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const connectedCount = INTEGRATIONS.filter(i => isConnected(i.id)).length

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Integraciones</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando estado...
        </div>
      </div>
    )
  }

  // Group by category
  const grouped: Record<string, IntegrationConfig[]> = {}
  for (const int of INTEGRATIONS) {
    if (!grouped[int.category]) grouped[int.category] = []
    grouped[int.category].push(int)
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          <Plug className="h-5 w-5 text-[#00D4FF]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Integraciones & APIs</h2>
          <p className="text-[11px] text-muted-foreground">
            {connectedCount}/{INTEGRATIONS.length} conectadas — configura cada servicio para que KIRA funcione al 100%
          </p>
        </div>
      </motion.div>

      {/* Status summary bar */}
      <motion.div variants={fadeUp} className="flex gap-2 flex-wrap">
        {INTEGRATIONS.map(int => (
          <div
            key={int.id}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border',
              isConnected(int.id)
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-white/[0.02] text-muted-foreground/60 border-white/[0.06]'
            )}
          >
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isConnected(int.id) ? '#10B981' : '#555' }} />
            {int.name.split(' ')[0]}
          </div>
        ))}
      </motion.div>

      {/* Categories */}
      {CATEGORY_ORDER.map(cat => {
        const items = grouped[cat]
        if (!items) return null

        return (
          <motion.div key={cat} variants={fadeUp} className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {CATEGORY_LABELS[cat]}
            </h3>

            {items.map(int => {
              const Icon = int.icon
              const connected = isConnected(int.id)
              const isExpanded = expandedGuide === int.id || (int.autoExpandWhenDisconnected && !connected)
              const savedKey = savedKeys.find(k => k.service === int.keyService)
              const keyMsg = int.keyService ? keyMessages[int.keyService] : null

              return (
                <motion.div
                  key={int.id}
                  variants={fadeUp}
                  className="glass-card !rounded-2xl overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${int.color}15` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: int.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <h3 className="text-sm font-semibold text-foreground">{int.name}</h3>
                          <span className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            connected
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-white/[0.04] text-muted-foreground border border-white/[0.08]'
                          )}>
                            {connected ? (
                              <span className="flex items-center gap-1"><Check className="h-2.5 w-2.5" /> Conectado</span>
                            ) : (
                              <span className="flex items-center gap-1"><X className="h-2.5 w-2.5" /> Pendiente</span>
                            )}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{int.desc}</p>

                        {/* API Key Input (for key-based services) */}
                        {int.requiresKey && int.keyService && (
                          <div className="mt-3 space-y-2">
                            {savedKey?.has_key && (
                              <div className="flex items-center gap-2 text-[11px]">
                                <Key className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground font-mono">{savedKey.masked_key}</span>
                                <button
                                  onClick={() => deleteApiKey(int.keyService!)}
                                  className="text-red-400/70 hover:text-red-400 text-[10px] cursor-pointer"
                                >
                                  Eliminar
                                </button>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <input
                                  type={keyVisible[int.keyService] ? 'text' : 'password'}
                                  value={keyInputs[int.keyService] || ''}
                                  onChange={(e) => setKeyInputs(prev => ({ ...prev, [int.keyService!]: e.target.value }))}
                                  placeholder={int.keyPlaceholder}
                                  className="w-full px-3 py-2 pr-8 rounded-xl text-[12px] font-mono bg-white/[0.03] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-[#00D4FF]/30"
                                />
                                <button
                                  onClick={() => setKeyVisible(prev => ({ ...prev, [int.keyService!]: !prev[int.keyService!] }))}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground cursor-pointer"
                                >
                                  {keyVisible[int.keyService] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => saveApiKey(int.keyService!)}
                                disabled={!keyInputs[int.keyService]?.trim() || savingKey === int.keyService}
                                className="px-4 py-2 rounded-xl text-[11px] font-medium bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] hover:bg-[#00D4FF]/20 disabled:opacity-30 cursor-pointer transition-all shrink-0"
                              >
                                {savingKey === int.keyService ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  'Guardar'
                                )}
                              </motion.button>
                            </div>
                            {keyMsg && (
                              <p className={cn('text-[11px]', keyMsg.ok ? 'text-emerald-400' : 'text-red-400')}>
                                {keyMsg.ok ? <Check className="h-3 w-3 inline mr-1" /> : <X className="h-3 w-3 inline mr-1" />}
                                {keyMsg.text}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Google Calendar specific actions */}
                        {int.id === 'google_calendar' && connected && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <RefreshCw className="h-3 w-3" />
                              Último sync: {formatLastSync(status?.google_calendar.last_sync || null)}
                            </div>
                            <div className="flex items-center gap-2">
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSync}
                                disabled={syncing}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-foreground hover:bg-white/[0.08] disabled:opacity-50 cursor-pointer transition-all"
                              >
                                {syncing ? <><Loader2 className="h-3 w-3 animate-spin" /> Sincronizando...</> : <><RefreshCw className="h-3 w-3" /> Sincronizar</>}
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleTranscripts}
                                disabled={fetchingTranscripts}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-foreground hover:bg-white/[0.08] disabled:opacity-50 cursor-pointer transition-all"
                              >
                                {fetchingTranscripts ? <><Loader2 className="h-3 w-3 animate-spin" /> Buscando...</> : <><FileText className="h-3 w-3" /> Transcripciones</>}
                              </motion.button>
                            </div>
                            {syncResult && <p className="text-[11px] text-[#00D4FF]">{syncResult}</p>}
                            {transcriptResult && <p className="text-[11px] text-[#00D4FF]">{transcriptResult}</p>}
                          </div>
                        )}

                        {/* Mac Daemon status */}
                        {int.id === 'mac_daemon' && status?.mac_daemon && (
                          <div className="mt-3">
                            {status.mac_daemon.connected ? (
                              <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                Mac online
                                {status.mac_daemon.capabilities && (
                                  <span className="text-muted-foreground ml-1">
                                    ({Object.entries(status.mac_daemon.capabilities).filter(([, v]) => v).map(([k]) => k.replace('has_', '')).join(', ')})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                                <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                                Mac offline — las tareas se encolarán
                              </div>
                            )}
                          </div>
                        )}

                        {/* Verify connection button — always visible */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => verifyConnection(int.id)}
                            disabled={verifying === int.id}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium cursor-pointer transition-all',
                              connected
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15'
                                : 'bg-white/[0.04] border border-white/[0.08] text-foreground hover:bg-white/[0.08]'
                            )}
                          >
                            {verifying === int.id ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Verificando...</>
                            ) : (
                              <><RefreshCw className="h-3 w-3" /> Verificar conexión</>
                            )}
                          </motion.button>

                          <button
                            onClick={() => setExpandedGuide(isExpanded ? null : int.id)}
                            className="flex items-center gap-1.5 text-[11px] text-[#00D4FF]/70 hover:text-[#00D4FF] cursor-pointer transition-colors"
                          >
                            <Shield className="h-3 w-3" />
                            {connected ? 'Guía' : 'Cómo conectar'}
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        </div>

                        {/* Verify result */}
                        {verifyResults[int.id] && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              'mt-2 px-3 py-2 rounded-xl text-[11px] border',
                              verifyResults[int.id].ok
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/5 border-red-500/20 text-red-400'
                            )}
                          >
                            <div className="flex items-center gap-1.5 font-medium">
                              {verifyResults[int.id].ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              {verifyResults[int.id].message}
                            </div>
                            {verifyResults[int.id].details && (
                              <p className="mt-0.5 text-[10px] opacity-70">{verifyResults[int.id].details}</p>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable setup guide */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0 border-t border-white/[0.06]">
                          <div className="mt-3 space-y-3">
                            {/* Steps */}
                            <ol className="space-y-1.5">
                              {int.setupGuide.steps.map((step, i) => (
                                <li key={i} className="flex gap-2.5 text-[12px] text-muted-foreground leading-relaxed">
                                  {step.startsWith('  ') ? (
                                    <span className="ml-6 font-mono text-[11px] text-foreground/70 bg-white/[0.04] px-2 py-0.5 rounded">
                                      {step.trim()}
                                    </span>
                                  ) : (
                                    <>
                                      <span className="shrink-0 h-5 w-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-semibold text-foreground/60 mt-0.5">
                                        {i + 1}
                                      </span>
                                      <span>{step}</span>
                                    </>
                                  )}
                                </li>
                              ))}
                            </ol>

                            {/* Terminal command block */}
                            {int.setupGuide.terminalCommand && (
                              <div className="relative group">
                                <div className="font-mono text-[11px] bg-black/30 border border-white/[0.08] rounded-xl px-4 py-3 text-emerald-400">
                                  <span className="text-muted-foreground/50 select-none">$ </span>
                                  {int.setupGuide.terminalCommand}
                                </div>
                                <button
                                  onClick={() => navigator.clipboard.writeText(int.setupGuide.terminalCommand!)}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Copiar comando"
                                >
                                  <Copy className="h-3 w-3 text-muted-foreground" />
                                </button>
                              </div>
                            )}

                            {/* Link */}
                            {int.setupGuide.url && (
                              <a
                                href={int.setupGuide.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#00D4FF] hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {int.setupGuide.urlLabel}
                              </a>
                            )}

                            {/* Pricing */}
                            {int.setupGuide.pricing && (
                              <p className="text-[11px] text-muted-foreground/60">
                                <span className="font-semibold text-muted-foreground">Precio:</span> {int.setupGuide.pricing}
                              </p>
                            )}

                            {/* Notes */}
                            {int.setupGuide.notes && (
                              <p className="text-[11px] text-muted-foreground/70 italic">
                                {int.setupGuide.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </motion.div>
        )
      })}

      {/* Quick setup summary */}
      <motion.div variants={fadeUp} className="glass-card !rounded-2xl p-4 border-[#00D4FF]/10">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-[#00D4FF]" />
          Resumen de configuración
        </h3>
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <p><span className="text-foreground font-medium">.env.local</span> — Variables del servidor (ya configuradas o por configurar):</p>
          <div className="mt-2 font-mono text-[10px] bg-black/20 rounded-xl p-3 space-y-1">
            <p className={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-emerald-400' : 'text-red-400'}>NEXT_PUBLIC_SUPABASE_URL=...</p>
            <p className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-emerald-400' : 'text-red-400'}>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</p>
            <p className="text-muted-foreground/50">ANTHROPIC_API_KEY=sk-ant-... <span className="text-muted-foreground/30"># o guardar arriba</span></p>
            <p className="text-muted-foreground/50">GOOGLE_CLIENT_ID=... <span className="text-muted-foreground/30"># OAuth</span></p>
            <p className="text-muted-foreground/50">GOOGLE_CLIENT_SECRET=... <span className="text-muted-foreground/30"># OAuth</span></p>
            <p className="text-muted-foreground/50">BRAVE_API_KEY=... <span className="text-muted-foreground/30"># o guardar arriba</span></p>
            <p className="text-muted-foreground/50">E2B_API_KEY=... <span className="text-muted-foreground/30"># o guardar arriba</span></p>
            <p className="text-muted-foreground/50">MAC_DAEMON_SECRET=... <span className="text-muted-foreground/30"># para el daemon</span></p>
            <p className="text-muted-foreground/50">KIRA_USER_ID=... <span className="text-muted-foreground/30"># tu UUID de Supabase</span></p>
            <p className="text-muted-foreground/50">CRON_SECRET=... <span className="text-muted-foreground/30"># para Vercel crons</span></p>
          </div>
          <p className="mt-2 text-muted-foreground/50 italic">
            Las API keys guardadas en esta página se almacenan en Supabase con RLS. Las de .env.local son para el servidor.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
