'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, HardDrive, MessageCircle, Mail, FileText, RefreshCw, Check, X, Loader2 } from 'lucide-react'

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

  const ConnectedBadge = ({ connected }: { connected: boolean }) => (
    <Badge variant={connected ? 'default' : 'secondary'} className={connected
      ? 'text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : 'text-[10px]'
    }>
      {connected ? <><Check className="h-2.5 w-2.5 mr-1" /> Conectado</> : <><X className="h-2.5 w-2.5 mr-1" /> No conectado</>}
    </Badge>
  )

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

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Integraciones</h2>
      <div className="space-y-3">

        {/* Google Calendar — ACTIVE */}
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-[rgba(66,133,244,0.1)] flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-[#4285F4]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-foreground">Google Calendar</h3>
                <ConnectedBadge connected={status?.google_calendar.connected || false} />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Sincroniza meetings automaticamente. Los eventos pasados cuentan como completados.
              </p>

              {status?.google_calendar.connected && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <RefreshCw className="h-3 w-3" />
                    Ultimo sync: {formatLastSync(status.google_calendar.last_sync)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSync}
                      disabled={syncing}
                      className="h-7 text-xs"
                    >
                      {syncing ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Sincronizando...</> : <><RefreshCw className="h-3 w-3 mr-1" /> Sincronizar ahora</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTranscripts}
                      disabled={fetchingTranscripts}
                      className="h-7 text-xs"
                    >
                      {fetchingTranscripts ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Buscando...</> : <><FileText className="h-3 w-3 mr-1" /> Buscar transcripciones</>}
                    </Button>
                  </div>
                  {syncResult && <p className="text-[11px] text-[#00D4FF]">{syncResult}</p>}
                  {transcriptResult && <p className="text-[11px] text-[#00D4FF]">{transcriptResult}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Google Drive — ACTIVE (same auth) */}
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-[rgba(66,133,244,0.1)] flex items-center justify-center shrink-0">
              <HardDrive className="h-5 w-5 text-[#4285F4]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-foreground">Google Drive</h3>
                <ConnectedBadge connected={status?.google_drive.connected || false} />
              </div>
              <p className="text-xs text-muted-foreground">
                Acceso a transcripciones de Google Meet guardadas en Drive.
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp — COMING SOON */}
        <div className="p-4 rounded-lg border border-border bg-card opacity-60">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-foreground">WhatsApp</h3>
                <Badge variant="secondary" className="text-[10px]">Proximamente</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Mensajes, seguimiento de conversaciones y notificaciones.</p>
            </div>
          </div>
        </div>

        {/* Notion — COMING SOON */}
        <div className="p-4 rounded-lg border border-border bg-card opacity-60">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-foreground">Notion</h3>
                <Badge variant="secondary" className="text-[10px]">Proximamente</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Sincroniza bases de datos, notas y documentos.</p>
            </div>
          </div>
        </div>

        {/* Gmail — COMING SOON */}
        <div className="p-4 rounded-lg border border-border bg-card opacity-60">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-foreground">Gmail</h3>
                <Badge variant="secondary" className="text-[10px]">Proximamente</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Lee y gestiona emails, extrae tareas de conversaciones.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
