'use client'

import { useMemo } from 'react'
import { getGreeting, formatDate } from '@/lib/utils/time'
import { useTaskStore } from '@/stores/taskStore'

interface DayStatusProps {
  totalWorkedMins: number
  dailyGoalHours: number
}

export function DayStatus({ totalWorkedMins, dailyGoalHours }: DayStatusProps) {
  const { tasks } = useTaskStore()
  const today = new Date()

  const completedToday = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status === 'done' &&
          t.completed_at &&
          new Date(t.completed_at).toDateString() === today.toDateString()
      ).length,
    [tasks, today]
  )

  const plannedToday = useMemo(
    () =>
      tasks.filter(
        (t) =>
          ['todo', 'in_progress'].includes(t.status) ||
          (t.status === 'done' &&
            t.completed_at &&
            new Date(t.completed_at).toDateString() === today.toDateString())
      ).length,
    [tasks, today]
  )

  const goalMins = dailyGoalHours * 60
  const progress = goalMins > 0 ? Math.min((totalWorkedMins / goalMins) * 100, 100) : 0
  const hoursWorked = Math.floor(totalWorkedMins / 60)
  const minsWorked = totalWorkedMins % 60

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">{getGreeting()}, Alex</h2>
          <p className="text-sm text-muted-foreground capitalize">{formatDate(today)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Tasks completadas</p>
          <p className="text-lg font-semibold text-foreground">
            {completedToday}
            <span className="text-muted-foreground font-normal">/{plannedToday}</span>
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Progreso del día</span>
          <span className="text-xs font-mono text-foreground">
            {hoursWorked}h {minsWorked}m / {dailyGoalHours}h
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #00D4FF, #0096FF)',
              boxShadow: progress > 0 ? '0 0 12px rgba(0, 212, 255, 0.4)' : 'none',
            }}
          />
        </div>
      </div>
    </div>
  )
}
