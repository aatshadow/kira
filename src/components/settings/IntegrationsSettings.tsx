'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Calendar, HardDrive, MessageCircle, Mail, FileText, RefreshCw, Check, X, Loader2, Plug } from 'lucide-react'
import { fadeUp, staggerContainer } from '@/lib/animations'

interface IntegrationStatus {
  google_calendar: { connected: boolean; last_sync: string | null }
  google_drive: { connected: boolean }
  whatsapp: { connected: boolean }
  notion: { connected: boolean }
  gmail: { connected: boolean }
}

export function IntegrationsSettings() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [fetchingTranscripts, setFetchingTranscripts] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [transcriptResult, setTranscriptResult] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/status')
      if (res.ok) setStatus(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (data.skipped) {
        setSyncResult('Sync reciente — espera 2 min entre syncs')
      } else {
        setSyncResult(`${data.synced} nuevos, ${data.updated} actualizados`)
      }
      fetchStatus()
    } catch {
      setSyncResult('Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  const handleTranscripts = async () => {
    setFetchingTranscripts(true)
    setTranscriptResult(null)
    try {
      const res = await fetch('/api/calendar/transcripts', { method: 'POST' })
      const data = await res.json()
      setTranscriptResult(`${data.found} transcripciones encontradas de ${data.processed} meetings`)
    } catch {
      setTranscriptResult('Error al buscar transcripciones')
    } finally {
      setFetchingTranscripts(false)
    }
  }

  const formatLastSync = (iso: string | null) => {
    if (!iso) return 'Nunca'
    const d = new Date(iso)
    const now = new Date()
    const diffMin = Math.round((now.getTime() - d.getTime()) / 60000)
    if (diffMin < 1) return 'Ahora mismo'
    if (diffMin < 60) return `Hace ${diffMin} min`
    if (diffMin < 1440) return `Hace ${Math.round(diffMin / 60)}h`
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

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

  const integrations = [
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      desc: 'Sincroniza meetings automaticamente. Los eventos pasados cuentan como completados.',
      icon: Calendar,
      color: '#4285F4',
      connected: status?.google_calendar.connected || false,
      hasActions: true,
    },
    {
      id: 'google_drive',
      name: 'Google Drive',
      desc: 'Acceso a transcripciones de Google Meet guardadas en Drive.',
      icon: HardDrive,
      color: '#4285F4',
      connected: status?.google_drive.connected || false,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      desc: 'Mensajes, seguimiento de conversaciones y notificaciones.',
      icon: MessageCircle,
      color: '#25D366',
      connected: status?.whatsapp.connected || false,
    },
    {
      id: 'notion',
      name: 'Notion',
      desc: 'Sincroniza bases de datos, notas y documentos.',
      icon: FileText,
      color: '#000',
      connected: status?.notion.connected || false,
    },
    {
      id: 'gmail',
      name: 'Gmail',
      desc: 'Lee y gestiona emails, extrae tareas de conversaciones.',
      icon: Mail,
      color: '#EA4335',
      connected: status?.gmail.connected || false,
    },
  ]

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          <Plug className="h-5 w-5 text-[#00D4FF]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Integraciones</h2>
          <p className="text-[11px] text-muted-foreground">Conecta tus herramientas para que KIRA las controle</p>
        </div>
      </motion.div>

      <div className="space-y-3">
        {integrations.map((int) => {
          const Icon = int.icon
          return (
            <motion.div
              key={int.id}
              variants={fadeUp}
              className="glass-card !rounded-2xl p-4"
            >
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
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      int.connected
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-white/[0.04] text-muted-foreground border border-white/[0.08]'
                    }`}>
                      {int.connected ? (
                        <span className="flex items-center gap-1"><Check className="h-2.5 w-2.5" /> Conectado</span>
                      ) : (
                        <span className="flex items-center gap-1"><X className="h-2.5 w-2.5" /> Conectar</span>
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{int.desc}</p>

                  {/* Google Calendar actions */}
                  {int.id === 'google_calendar' && int.connected && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <RefreshCw className="h-3 w-3" />
                        Ultimo sync: {formatLastSync(status?.google_calendar.last_sync || null)}
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
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
