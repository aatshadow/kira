'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useUIStore } from '@/stores/uiStore'
import { useMeetings } from '@/lib/hooks/useMeetings'
import type { Meeting } from '@/types/meeting'

export function MeetingModal() {
  const { activeModal, modalData, closeModal } = useUIStore()
  const { createMeeting, editMeeting } = useMeetings()

  const isOpen = activeModal === 'meeting-create' || activeModal === 'meeting-edit'
  const isEdit = activeModal === 'meeting-edit'
  const existing = modalData?.meeting as Meeting | undefined

  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMins, setDurationMins] = useState('')
  const [participants, setParticipants] = useState('')
  const [preNotes, setPreNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit && existing) {
      setTitle(existing.title)
      setScheduledAt(existing.scheduled_at ? existing.scheduled_at.slice(0, 16) : '')
      setDurationMins(existing.duration_mins?.toString() || '')
      setParticipants(existing.participants || '')
      setPreNotes(existing.pre_notes || '')
    } else {
      setTitle('')
      setScheduledAt('')
      setDurationMins('')
      setParticipants('')
      setPreNotes('')
    }
    setError('')
  }, [isOpen, isEdit, existing])

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('El título es obligatorio')
      return
    }
    setSaving(true)
    const data = {
      title: title.trim(),
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      duration_mins: durationMins ? parseInt(durationMins) : null,
      participants: participants.trim() || null,
      pre_notes: preNotes.trim() || null,
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
      <DialogContent className="sm:max-w-[480px] bg-card border-border animate-kira-modal-in">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar meeting' : 'Nuevo meeting'}</DialogTitle>
        </DialogHeader>
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
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={closeModal}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-[#00D4FF] text-black hover:bg-[#00A8CC]"
          >
            {saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear meeting'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
