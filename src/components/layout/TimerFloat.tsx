'use client'

import { useState } from 'react'
import { X, Play, Pause, Square, Plus, ChevronRight } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTimer } from '@/lib/hooks/useTimer'
import { formatTime, formatDuration } from '@/lib/utils/time'
import { Button } from '@/components/ui/button'
import { PriorityDot } from '@/components/shared/PriorityDot'
import { cn } from '@/lib/utils'

export function TimerFloat() {
  const { timerFloatOpen, closeTimerFloat, openModal } = useUIStore()
  const { activeSession, pausedSessions, startTimer, handlePause } = useTimer()
  const { handleResume } = useTimer()
  const { tasks, categories, projects } = useTaskStore()
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')

  if (!timerFloatOpen) return null

  const availableTasks = tasks.filter((t) => ['backlog', 'todo', 'waiting'].includes(t.status))

  const handleStartNew = (taskId?: string) => {
    const id = taskId || selectedTaskId
    if (!id) return
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const cat = categories.find((c) => c.id === task.category_id)
    const proj = projects.find((p) => p.id === task.project_id)
    startTimer(task.id, task.title, cat?.name || '', proj?.name || '')
    setSelectedTaskId('')
  }

  const handleStop = (sessionId: string) => {
    openModal('timer-stop', { sessionId })
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 z-[199] bg-black/60 backdrop-blur-sm"
        onClick={closeTimerFloat}
      />

      <div className="fixed z-[200] bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto md:w-[340px] rounded-t-2xl md:rounded-2xl border-t md:border border-[rgba(0,212,255,0.25)] bg-card shadow-[0_-8px_32px_rgba(0,0,0,0.6)] md:shadow-[0_24px_64px_rgba(0,0,0,0.8),0_0_0_1px_var(--border),0_0_40px_rgba(0,212,255,0.08)] animate-kira-float-in">
        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center pt-2">
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 md:pt-4 pb-2">
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium">
            KIRA Timer
          </span>
          <button
            onClick={closeTimerFloat}
            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="max-h-[60vh] md:max-h-none overflow-y-auto">
          {/* Active Timer */}
          <div className="px-5 pb-4">
            {activeSession ? (
              <div className="flex flex-col items-center">
                <div className="py-6">
                  <span className="kira-timer-glow active text-6xl font-light font-mono tracking-wider">
                    {formatTime(activeSession.elapsedSecs)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground text-center truncate max-w-full mb-1">
                  {activeSession.taskTitle}
                </p>
                {(() => {
                  const task = tasks.find((t) => t.id === activeSession.taskId)
                  const prev = task?.actual_mins || 0
                  return prev > 0 ? (
                    <p className="text-[11px] text-[#00D4FF]/70 text-center mb-1">
                      Acumulado previo: {formatDuration(prev)}
                    </p>
                  ) : null
                })()}
                <p className="text-[11px] text-muted-foreground/60 text-center mb-4">
                  {[activeSession.taskCategory, activeSession.taskProject].filter(Boolean).join(' · ')}
                </p>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="secondary"
                    className="flex-1 h-12 md:h-10"
                    onClick={() => handlePause(activeSession.id)}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pausar
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 h-12 md:h-10 hover:border-destructive/40 hover:text-destructive"
                    onClick={() => handleStop(activeSession.id)}
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-2">
                <p className="text-xs text-muted-foreground mb-3">Selecciona una task para iniciar:</p>
                {availableTasks.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground mb-2">No hay tasks disponibles</p>
                    <button
                      onClick={() => { closeTimerFloat(); openModal('task-create') }}
                      className="text-xs text-[#00D4FF] hover:underline cursor-pointer"
                    >
                      + Crear nueva task
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[35vh] overflow-y-auto">
                    {availableTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => handleStartNew(task.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors cursor-pointer',
                          selectedTaskId === task.id
                            ? 'bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.25)]'
                            : 'hover:bg-secondary/70 border border-transparent'
                        )}
                      >
                        <PriorityDot priority={task.priority} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{task.title}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{task.status}</p>
                        </div>
                        <Play className="h-4 w-4 text-[#00D4FF] shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Paused Sessions */}
          {pausedSessions.length > 0 && (
            <>
              <div className="border-t border-border/50 mx-5" />
              <div className="px-5 py-3">
                <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium">
                  En pausa
                </span>
                <div className="mt-2 space-y-1">
                  {pausedSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between py-2.5 md:py-2 px-2 rounded-md hover:bg-secondary transition-colors"
                    >
                      <span className="text-xs text-foreground truncate max-w-[140px]">
                        {session.taskTitle}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatTime(session.elapsedSecs)}
                        </span>
                        <button
                          onClick={() => handleResume(session.id)}
                          className="text-[#00D4FF] hover:text-[#00A8CC] cursor-pointer p-1"
                        >
                          <Play className="h-4 w-4 md:h-3.5 md:w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 mx-5" />
        <div className="px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => {
              closeTimerFloat()
              openModal('task-create')
            }}
            className="w-full flex items-center justify-center gap-1 text-xs text-[#00D4FF] hover:bg-[rgba(0,212,255,0.08)] py-2.5 md:py-2 rounded-md transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva sesión
          </button>
        </div>
      </div>
    </>
  )
}
