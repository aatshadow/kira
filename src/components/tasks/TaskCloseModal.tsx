'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUIStore } from '@/stores/uiStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTasks } from '@/lib/hooks/useTasks'
import { formatTime, formatDuration } from '@/lib/utils/time'
import { cn } from '@/lib/utils'

const difficulties = [
  { id: 'easier', label: 'Más fácil' },
  { id: 'as_expected', label: 'Como esperaba' },
  { id: 'harder', label: 'Más difícil' },
] as const

export function TaskCloseModal() {
  const { activeModal, modalData, closeModal } = useUIStore()
  const { tasks } = useTaskStore()
  const { completeTask, createTask, editTask } = useTasks()

  const isOpen = activeModal === 'task-close'
  const taskId = modalData?.taskId as string | undefined
  const totalSecs = (modalData?.totalSecs as number) || 0
  const showManualTime = (modalData?.showManualTime as boolean) || false
  const task = tasks.find((t) => t.id === taskId)

  const [difficulty, setDifficulty] = useState<string>('')
  const [postNotes, setPostNotes] = useState('')
  const [hasPending, setHasPending] = useState(false)
  const [pendingTitle, setPendingTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [manualHours, setManualHours] = useState('')
  const [manualMins, setManualMins] = useState('')

  if (!isOpen || !task) return null

  const displaySecs = totalSecs > 0 ? totalSecs : (manualHours || manualMins ? (parseInt(manualHours || '0') * 3600 + parseInt(manualMins || '0') * 60) : 0)

  const handleConfirm = async () => {
    setSaving(true)

    // Calculate actual_mins from timer or manual input
    let actualMins: number | undefined
    if (totalSecs > 0) {
      actualMins = Math.ceil(totalSecs / 60)
    } else if (manualHours || manualMins) {
      actualMins = (parseInt(manualHours || '0') * 60) + parseInt(manualMins || '0')
    }

    await completeTask(task.id, {
      difficulty: (difficulty as 'easier' | 'as_expected' | 'harder') || undefined,
      post_notes: postNotes.trim() || undefined,
    })

    // Save actual_mins separately via editTask
    if (actualMins && actualMins > 0) {
      await editTask(task.id, { actual_mins: actualMins })
    }

    if (hasPending && pendingTitle.trim()) {
      await createTask({
        title: pendingTitle.trim(),
        status: 'backlog',
        parent_task_id: task.id,
        category_id: task.category_id,
        project_id: task.project_id,
        priority: task.priority,
      })
    }

    setSaving(false)
    closeModal()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border animate-kira-modal-in">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Completar task</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Time summary */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
            <div>
              <p className="text-xs text-muted-foreground">Tiempo invertido</p>
              {totalSecs > 0 ? (
                <p className="text-xl font-mono text-[#00D4FF]">{formatTime(totalSecs)}</p>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      placeholder="0"
                      value={manualHours}
                      onChange={(e) => setManualHours(e.target.value)}
                      className="w-16 h-8 text-center text-sm bg-background"
                    />
                    <span className="text-xs text-muted-foreground">h</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={manualMins}
                      onChange={(e) => setManualMins(e.target.value)}
                      className="w-16 h-8 text-center text-sm bg-background"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </div>
              )}
            </div>
            {task.estimated_mins && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Estimado</p>
                <p className="text-sm text-foreground">{formatDuration(task.estimated_mins)}</p>
              </div>
            )}
          </div>

          {/* Difficulty */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Dificultad real</Label>
            <div className="flex gap-2">
              {difficulties.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  className={cn(
                    'flex-1 py-2 text-xs rounded-md border transition-all cursor-pointer',
                    difficulty === d.id
                      ? 'border-[#00D4FF] bg-[rgba(0,212,255,0.08)] text-[#00D4FF]'
                      : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Post notes */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Notas post-ejecución
            </Label>
            <Textarea
              placeholder="¿Qué ocurrió? ¿Qué aprendiste?"
              value={postNotes}
              onChange={(e) => setPostNotes(e.target.value)}
              className="bg-secondary min-h-[80px]"
            />
          </div>

          {/* Pending work */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              ¿Quedó algo pendiente?
            </Label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setHasPending(false)}
                className={cn(
                  'flex-1 py-2 text-xs rounded-md border transition-all cursor-pointer',
                  !hasPending
                    ? 'border-[#00D4FF] bg-[rgba(0,212,255,0.08)] text-[#00D4FF]'
                    : 'border-border text-muted-foreground'
                )}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setHasPending(true)}
                className={cn(
                  'flex-1 py-2 text-xs rounded-md border transition-all cursor-pointer',
                  hasPending
                    ? 'border-[#00D4FF] bg-[rgba(0,212,255,0.08)] text-[#00D4FF]'
                    : 'border-border text-muted-foreground'
                )}
              >
                Sí
              </button>
            </div>
            {hasPending && (
              <Input
                placeholder="Título de la nueva task..."
                value={pendingTitle}
                onChange={(e) => setPendingTitle(e.target.value)}
                className="bg-secondary"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={closeModal}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="bg-[#00D4FF] text-black hover:bg-[#00A8CC]"
          >
            {saving ? 'Guardando...' : 'Confirmar Done'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
