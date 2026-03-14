'use client'

import { useMemo } from 'react'
import { DayStatus } from '@/components/dashboard/DayStatus'
import { ActiveSession } from '@/components/dashboard/ActiveSession'
import { QuickBacklog } from '@/components/dashboard/QuickBacklog'
import { useTasks } from '@/lib/hooks/useTasks'
import { useTaskStore } from '@/stores/taskStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { Clock, ListTodo } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { useUIStore } from '@/stores/uiStore'
import { Badge } from '@/components/ui/badge'
import { formatDuration } from '@/lib/utils/time'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DashboardPage() {
  useTasks() // trigger fetch
  const { tasks } = useTaskStore()
  const { meetings } = useMeetingStore()
  const { openModal } = useUIStore()

  const todayCompleted = useMemo(() => {
    const today = new Date().toDateString()
    return tasks.filter(
      (t) => t.status === 'done' && t.completed_at && new Date(t.completed_at).toDateString() === today
    )
  }, [tasks])

  const nextMeeting = useMemo(() => {
    const now = new Date()
    return meetings
      .filter((m) => m.status === 'scheduled' && m.scheduled_at && new Date(m.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0]
  }, [meetings])

  if (tasks.length === 0) {
    return (
      <div className="py-16">
        <EmptyState
          icon={Clock}
          title="Empieza tu primer día con KIRA"
          description="Crea una task y activa el timer para empezar a registrar tu tiempo"
          actionLabel="+ Crear primera task"
          onAction={() => openModal('task-create')}
        />
      </div>
    )
  }

  return (
    <div className="py-8 space-y-6">
      {/* Top row */}
      <DayStatus totalWorkedMins={0} dailyGoalHours={8} />

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active session - takes 2 cols */}
        <div className="lg:col-span-2">
          <ActiveSession />
        </div>

        {/* Quick backlog */}
        <div>
          <QuickBacklog />
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's completed */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Completadas hoy
          </h3>
          {todayCompleted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Ninguna task completada todavía</p>
          ) : (
            <div className="space-y-2">
              {todayCompleted.map((task) => (
                <div key={task.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-foreground/70 line-through">{task.title}</span>
                  {task.estimated_mins && (
                    <span className="text-[11px] text-muted-foreground">
                      {formatDuration(task.estimated_mins)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next meeting */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Próximo meeting
          </h3>
          {nextMeeting ? (
            <div>
              <p className="text-sm font-medium text-foreground mb-1">{nextMeeting.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(nextMeeting.scheduled_at!), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
              </p>
              {nextMeeting.participants && (
                <p className="text-xs text-muted-foreground mt-1">{nextMeeting.participants}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">Sin meetings programados</p>
          )}
        </div>
      </div>
    </div>
  )
}
