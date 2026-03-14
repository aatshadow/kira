'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PrioritySelector } from '@/components/shared/PrioritySelector'
import { useUIStore } from '@/stores/uiStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTasks } from '@/lib/hooks/useTasks'
import { Sparkles, PenLine, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Priority, Task } from '@/types/task'

export function TaskModal() {
  const { activeModal, modalData, closeModal } = useUIStore()
  const { categories, projects, tags } = useTaskStore()
  const { createTask, editTask } = useTasks()

  const isOpen = activeModal === 'task-create' || activeModal === 'task-edit'
  const isEdit = activeModal === 'task-edit'
  const existingTask = modalData?.task as Task | undefined

  const [mode, setMode] = useState<'manual' | 'ai'>('manual')
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [priority, setPriority] = useState<Priority | null>(null)
  const [estimatedMins, setEstimatedMins] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [taskTags, setTaskTags] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit && existingTask) {
      setMode('manual')
      setTitle(existingTask.title)
      setDescription(existingTask.description || '')
      setCategoryId(existingTask.category_id || '')
      setProjectId(existingTask.project_id || '')
      setPriority(existingTask.priority)
      setEstimatedMins(existingTask.estimated_mins?.toString() || '')
      setDueDate(existingTask.due_date || '')
      setTaskTags(existingTask.tags?.join(', ') || '')
      setNotes(existingTask.notes || '')
    } else {
      setMode(modalData?.mode === 'ai' ? 'ai' : 'manual')
      setTitle('')
      setDescription('')
      setCategoryId('')
      setProjectId('')
      setPriority(null)
      setEstimatedMins('')
      setDueDate('')
      setTaskTags('')
      setNotes('')
      setAiText('')
      setAiError('')
    }
    setError('')
  }, [isOpen, isEdit, existingTask, modalData?.mode])

  const handleAiParse = async () => {
    if (!aiText.trim()) return
    setAiLoading(true)
    setAiError('')

    try {
      const res = await fetch('/api/ai/text-to-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiText.trim(),
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          projects: projects.map((p) => ({ id: p.id, name: p.name })),
          tags: tags.map((t) => ({ id: t.id, name: t.name })),
          today: new Date().toISOString().split('T')[0],
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar')

      // Fill form fields with AI result
      setTitle(data.title || '')
      setDescription(data.description || '')
      setCategoryId(data.category_id || '')
      setProjectId(data.project_id || '')
      setPriority(data.priority || null)
      setEstimatedMins(data.estimated_mins?.toString() || '')
      setDueDate(data.due_date || '')
      setTaskTags(Array.isArray(data.tags) ? data.tags.join(', ') : '')
      setNotes('')

      // Switch to manual mode so user can review
      setMode('manual')
    } catch {
      setAiError(err instanceof Error ? err.message : 'Error al procesar el texto. Inténtalo de nuevo.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('El título es obligatorio')
      return
    }

    setSaving(true)
    const data = {
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId || null,
      project_id: projectId || null,
      priority,
      estimated_mins: estimatedMins ? parseInt(estimatedMins) : null,
      due_date: dueDate || null,
      tags: taskTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      notes: notes.trim() || null,
    }

    if (isEdit && existingTask) {
      await editTask(existingTask.id, data)
    } else {
      await createTask({ ...data, status: 'backlog' })
    }

    setSaving(false)
    closeModal()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border animate-kira-modal-in max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? 'Editar task' : 'Nueva task'}
          </DialogTitle>
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
              placeholder="Describe la tarea en lenguaje natural...&#10;&#10;Ej: Llamar a Pedro mañana para revisar el contrato del proyecto Wolf, es urgente y debería llevar unos 30 minutos"
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
              {/* Title */}
              <div>
                <Input
                  autoFocus
                  placeholder="Título de la task"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    setError('')
                  }}
                  className={error ? 'border-destructive' : ''}
                />
                {error && <p className="text-xs text-destructive mt-1">{error}</p>}
              </div>

              {/* Priority */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Prioridad</Label>
                <PrioritySelector value={priority} onChange={setPriority} />
              </div>

              {/* Category & Project */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Categoría</Label>
                  <Select value={categoryId} onValueChange={(v) => setCategoryId(v || '')}>
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Proyecto</Label>
                  <Select value={projectId} onValueChange={(v) => setProjectId(v || '')}>
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((proj) => (
                        <SelectItem key={proj.id} value={proj.id}>
                          {proj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Time & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Tiempo estimado (min)
                  </Label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={estimatedMins}
                    onChange={(e) => setEstimatedMins(e.target.value)}
                    className="bg-secondary"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Fecha límite</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-secondary"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Tags (separados por coma)
                </Label>
                <Input
                  placeholder="frontend, bug, urgent"
                  value={taskTags}
                  onChange={(e) => setTaskTags(e.target.value)}
                  className="bg-secondary"
                  list="tag-suggestions"
                />
                <datalist id="tag-suggestions">
                  {tags.map((t) => (
                    <option key={t.id} value={t.name} />
                  ))}
                </datalist>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Notas</Label>
                <Textarea
                  placeholder="Notas adicionales..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-secondary min-h-[80px]"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Descripción</Label>
                <Textarea
                  placeholder="Descripción detallada..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-secondary min-h-[60px]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-[#00D4FF] text-black hover:bg-[#00A8CC] hover:shadow-[0_0_8px_rgba(0,212,255,0.4)]"
              >
                {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear task'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
