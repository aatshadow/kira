'use client'

import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { useTimer } from '@/lib/hooks/useTimer'
import { formatTime } from '@/lib/utils/time'
import { PriorityDot } from '@/components/shared/PriorityDot'

export function ActiveSession() {
  const { activeSession } = useTimer()
  const { tasks } = useTaskStore()
  const { openTimerFloat, openModal } = useUIStore()

  if (activeSession) {
    return (
      <div className="rounded-lg border border-[rgba(0,212,255,0.25)] bg-card p-6 shadow-[0_0_40px_rgba(0,212,255,0.08)]">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
            Sesión activa
          </p>
          <p className="kira-timer-glow active text-5xl font-light font-mono tracking-wider mb-4">
            {formatTime(activeSession.elapsedSecs)}
          </p>
          <p className="text-sm text-foreground mb-1">{activeSession.taskTitle}</p>
          <p className="text-xs text-muted-foreground mb-4">
            {[activeSession.taskCategory, activeSession.taskProject].filter(Boolean).join(' · ')}
          </p>
          <Button variant="secondary" onClick={openTimerFloat}>
            Ver timer
          </Button>
        </div>
      </div>
    )
  }

  const nextTask = tasks
    .filter((t) => ['todo', 'backlog'].includes(t.status))
    .sort((a, b) => {
      const pOrder: Record<string, number> = { q1: 0, q2: 1, q3: 2, q4: 3 }
      return (pOrder[a.priority || ''] ?? 4) - (pOrder[b.priority || ''] ?? 4)
    })[0]

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">Sin sesión activa</p>
        {nextTask ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <PriorityDot priority={nextTask.priority} />
              <p className="text-sm font-medium text-foreground">{nextTask.title}</p>
            </div>
            <Button
              onClick={openTimerFloat}
              className="bg-[#00D4FF] text-black hover:bg-[#00A8CC] hover:shadow-[0_0_8px_rgba(0,212,255,0.4)]"
            >
              <Play className="h-4 w-4 mr-1" />
              Iniciar
            </Button>
          </>
        ) : (
          <Button
            onClick={() => openModal('task-create')}
            className="bg-[#00D4FF] text-black hover:bg-[#00A8CC]"
          >
            Crear primera task
          </Button>
        )}
      </div>
    </div>
  )
}
