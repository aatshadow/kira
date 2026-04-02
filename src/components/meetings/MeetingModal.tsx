'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useUIStore } from '@/stores/uiStore'
import { useMeetings } from '@/lib/hooks/useMeetings'
import { Sparkles, PenLine, Loader2, FileText, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Meeting } from '@/types/meeting'

export function MeetingModal() {
  const { activeModal, modalData, closeModal } = useUIStore()
  const { createMeeting, editMeeting } = useMeetings()

  const isOpen = activeModal === 'meeting-create' || activeModal === 'meeting-edit'
  const isEdit = activeModal === 'meeting-edit'
  const existing = modalData?.meeting as Meeting | undefined

  const [mode, setMode] = useState<'manual' | 'ai'>('manual')
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMins, setDurationMins] = useState('')
  const [participants, setParticipants] = useState('')
  const [preNotes, setPreNotes] = useState('')
  const [transcript, setTranscript] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fetchingTranscript, setFetchingTranscript] = useState(false)
  const [digestLoading, setDigestLoading] = useState(false)
  const [digestResult, setDigestResult] = useState<{ summary: string; tasks_created: number } | null>(null)

  useEffect(() => {
    if (isEdit && existing) {
      setMode('manual')
      setTitle(existing.title)
      setScheduledAt(existing.scheduled_at ? existing.scheduled_at.slice(0, 16) : '')
      setDurationMins(existing.duration_mins?.toString() || '')
      setParticipants(existing.participants || '')
      setPreNotes(existing.pre_notes || '')
      setTranscript(existing.transcript || '')
    } else {
      setMode('manual')
      setTitle('')
      setScheduledAt('')
      setDurationMins('')
      setParticipants('')
      setPreNotes('')
      setTranscript('')
      setAiText('')
      setAiError('')
    }
    setError('')
  }, [isOpen, isEdit, existing])

  const handleAiParse = async () => {
    if (!aiText.trim()) return
    setAiLoading(true)
    setAiError('')

    try {
      const res = await fetch('/api/ai/text-to-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiText.trim(),
          today: new Date().toISOString(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar')

      setTitle(data.title || '')
      if (data.scheduled_at) {
        const dt = new Date(data.scheduled_at)
        const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
        setScheduledAt(local)
      } else {
        setScheduledAt('')
      }
      setDurationMins(data.duration_mins?.toString() || '')
      setParticipants(data.participants || '')
      setPreNotes(data.pre_notes || '')

      setMode('manual')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Error al procesar el texto. Inténtalo de nuevo.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleFetchTranscript = async () => {
    if (!existing?.id) return
    setFetchingTranscript(true)
    try {
      const res = await fetch(`/api/calendar/transcripts?meetingId=${existing.id}`)
      const data = await res.json()
      if (data.found) {
        // Re-fetch from DB would be ideal, but we can just show a success message
        if (!data.already_exists) {
          setTranscript('[Transcripcion guardada — recarga para ver]')
        }
      }
    } catch { /* ignore */ }
    finally { setFetchingTranscript(false) }
  }

  const handleDigest = async () => {
    if (!existing?.id) return
    setDigestLoading(true)
    setDigestResult(null)
    try {
      const res = await fetch('/api/ai/meeting-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: existing.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setDigestResult({ summary: data.summary, tasks_created: data.tasks_created })
      }
    } catch { /* ignore */ }
    finally { setDigestLoading(false) }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('El título es obligatorio')
      return
    }
    setSaving(true)
    const data: Partial<Meeting> = {
      title: title.trim(),
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      duration_mins: durationMins ? parseInt(durationMins) : null,
      participants: participants.trim() || null,
      pre_notes: preNotes.trim() || null,
      transcript: transcript.trim() || null,
    }
    if (isEdit && existing) {
      await editMeeting(existing.id, data)
    } else {
      await createMeeting(data)
    }
    setSaving(false)
    closeModal()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border animate-kira-modal-in max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar meeting' : 'Nuevo meeting'}</DialogTitle>
        </DialogHeader>

        {/* Mode toggle — only show on create */}
        {!isEdit && (
          <div className="flex gap-1 p-1 bg-secondary rounded-lg">
            <button
              onClick={() => setMode('manual')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer',
                mode === 'manual'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <PenLine className="h-3.5 w-3.5" />
              Manual
            </button>
            <button
              onClick={() => setMode('ai')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer',
                mode === 'ai'
                  ? 'bg-background text-[#00D4FF] shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI
            </button>
          </div>
        )}

        {/* AI Mode */}
        {mode === 'ai' && (
          <div className="space-y-3 py-2">
            <Textarea
              autoFocus
              placeholder={"Describe el meeting en lenguaje natural...\n\nEj: Reunión con Pedro y María mañana a las 10 para revisar el contrato, una hora aproximadamente"}
              value={aiText}
              onChange={(e) => { setAiText(e.target.value); setAiError('') }}
              className="bg-secondary min-h-[140px] text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleAiParse()
                }
              }}
            />
            {aiError && <p className="text-xs text-destructive">{aiError}</p>}
            <Button
              onClick={handleAiParse}
              disabled={aiLoading || !aiText.trim()}
              className="w-full h-11 bg-[#00D4FF] text-black font-semibold hover:bg-[#00A8CC] hover:shadow-[0_0_8px_rgba(0,212,255,0.4)]"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Crear con AI
                </>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground/50 text-center">
              Cmd+Enter para enviar
            </p>
          </div>
        )}

        {/* Manual Mode */}
        {mode === 'manual' && (
          <>
            <div className="space-y-4 py-2">
              <div>
                <Input
                  autoFocus
                  placeholder="Título del meeting"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    setError('')
                  }}
                  className={error ? 'border-destructive' : ''}
                />
                {error && <p className="text-xs text-destructive mt-1">{error}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Fecha y hora</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="bg-secondary"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Duración (min)</Label>
                  <Input
                    type="number"
                    placeholder="60"
                    value={durationMins}
                    onChange={(e) => setDurationMins(e.target.value)}
                    className="bg-secondary"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Participantes</Label>
                <Input
                  placeholder="Juan, María, Carlos..."
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  className="bg-secondary"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Notas previas</Label>
                <Textarea
                  placeholder="Agenda, puntos a tratar..."
                  value={preNotes}
                  onChange={(e) => setPreNotes(e.target.value)}
                  className="bg-secondary min-h-[80px]"
                />
              </div>
              {isEdit && existing?.status === 'completed' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      Transcripcion
                    </Label>
                    <Textarea
                      placeholder="Pega aqui la transcripcion del meeting..."
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      className="bg-secondary min-h-[120px] text-sm"
                    />
                    {transcript.trim() && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {transcript.trim().split(/\s+/).length} palabras
                      </p>
                    )}
                  </div>

                  {/* Action buttons for completed meetings */}
                  <div className="flex flex-wrap gap-2">
                    {existing.calendar_event_id && !existing.transcript && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleFetchTranscript}
                        disabled={fetchingTranscript}
                        className="h-8 text-xs"
                      >
                        {fetchingTranscript
                          ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Buscando...</>
                          : <><FileText className="h-3 w-3 mr-1" /> Buscar transcripcion en Drive</>
                        }
                      </Button>
                    )}
                    {(existing.transcript || transcript.trim()) && !existing.ai_summary && !digestResult && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleDigest}
                        disabled={digestLoading}
                        className="h-8 text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      >
                        {digestLoading
                          ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generando...</>
                          : <><Zap className="h-3 w-3 mr-1" /> Generar resumen + tareas AI</>
                        }
                      </Button>
                    )}
                  </div>

                  {/* Show digest result */}
                  {(digestResult || existing.ai_summary) && (
                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                      <p className="text-[11px] font-medium text-purple-400 mb-2 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Resumen AI
                      </p>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {digestResult?.summary || existing.ai_summary}
                      </p>
                      {digestResult?.tasks_created ? (
                        <p className="text-[10px] text-[#00D4FF] mt-2">
                          {digestResult.tasks_created} tareas creadas automaticamente
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-[#00D4FF] text-black hover:bg-[#00A8CC] hover:shadow-[0_0_8px_rgba(0,212,255,0.4)]"
              >
                {saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear meeting'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
