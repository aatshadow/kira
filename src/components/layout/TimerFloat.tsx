'use client'

import { useState } from 'react'
import { X, Play, Pause, Square, Plus } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTimer } from '@/lib/hooks/useTimer'
import { formatTime } from '@/lib/utils/time'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function TimerFloat() {
  const { timerFloatOpen, closeTimerFloat, openModal } = useUIStore()
  const { activeSession, pausedSessions, startTimer, handlePause, stopTimer } = useTimer()
  const { handleResume } = useTimer()
  const { tasks, categories, projects } = useTaskStore()
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')

  if (!timerFloatOpen) return null

  const availableTasks = tasks.filter((t) => ['backlog', 'todo', 'waiting'].includes(t.status))

  const handleStartNew = () => {
    if (!selectedTaskId) return
    const task = tasks.find((t) => t.id === selectedTaskId)
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
    <div className="fixed bottom-6 right-6 z-[200] w-[340px] rounded-2xl border border-[rgba(0,212,255,0.25)] bg-card shadow-[0_24px_64px_rgba(0,0,0,0.8),0_0_0_1px_var(--border),0_0_40px_rgba(0,212,255,0.08)] animate-kira-float-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
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
            <p className="text-[11px] text-muted-foreground/60 text-center mb-4">
              {[activeSession.taskCategory, activeSession.taskProject].filter(Boolean).join(' · ')}
            </p>
            <div className="flex gap-2 w-full">
              <Button
                variant="secondary"
                className="flex-1 h-10"
                onClick={() => handlePause(activeSession.id)}
              >
                <Pause className="h-4 w-4 mr-1" />
                Pausar
              </Button>
              <Button
                variant="secondary"
                className="flex-1 h-10 hover:border-destructive/40 hover:text-destructive"
                onClick={() => handleStop(activeSession.id)}
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <div className="w-full mb-3">
              <Select value={selectedTaskId} onValueChange={(v) => setSelectedTaskId(v || '')}>
                <SelectTrigger className="w-full bg-secondary">
                  <SelectValue placeholder="Selecciona una task..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleStartNew}
              disabled={!selectedTaskId}
              className="w-full bg-[#00D4FF] text-black hover:bg-[#00A8CC] hover:shadow-[0_0_8px_rgba(0,212,255,0.4)] disabled:opacity-30"
            >
              <Play className="h-4 w-4 mr-1" />
              Iniciar
            </Button>
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
                  className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-secondary transition-colors"
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
                      className="text-[#00D4FF] hover:text-[#00A8CC] cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="border-t border-border/50 mx-5" />
      <div className="px-5 py-3">
        <button
          onClick={() => {
            closeTimerFloat()
            openModal('task-create')
          }}
          className="w-full flex items-center justify-center gap-1 text-xs text-[#00D4FF] hover:bg-[rgba(0,212,255,0.08)] py-2 rounded-md transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva sesión
        </button>
      </div>
    </div>
  )
}
