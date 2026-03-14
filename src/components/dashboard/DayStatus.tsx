'use client'

import { useMemo, useEffect, useState } from 'react'
import { getGreeting, formatDate } from '@/lib/utils/time'
import { useTaskStore } from '@/stores/taskStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/getUserId'
import { IS_DEMO } from '@/lib/demo'

interface DayStatusProps {
  dailyGoalHours: number
  calendarEventsMins?: number
}

export function DayStatus({ dailyGoalHours, calendarEventsMins = 0 }: DayStatusProps) {
  const { tasks } = useTaskStore()
  const { meetings } = useMeetingStore()
  const today = new Date()

  const [operativaMins, setOperativaMins] = useState(0)

  // Fetch actual worked time from timer_sessions
  useEffect(() => {
    if (IS_DEMO) return

    async function fetchWorkedTime() {
      const userId = await getUserId()
      if (!userId) return

      const supabase = createClient()
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('timer_sessions')
        .select('started_at, ended_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('started_at', startOfDay.toISOString())
        .lte('started_at', endOfDay.toISOString())

      if (error || !data) return

      let totalSecs = 0
      for (const session of data) {
        if (session.started_at && session.ended_at) {
          const start = new Date(session.started_at).getTime()
          const end = new Date(session.ended_at).getTime()
          totalSecs += (end - start) / 1000
        }
      }
      setOperativaMins(Math.round(totalSecs / 60))
    }

    fetchWorkedTime()
    const interval = setInterval(fetchWorkedTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // Meetings time: completed KIRA meetings + Google Calendar events
  const meetingsMins = useMemo(() => {
    const todayStr = today.toDateString()
    const kiraMeetingsMins = meetings
      .filter(
        (m) =>
          m.status === 'completed' &&
          m.scheduled_at &&
          new Date(m.scheduled_at).toDateString() === todayStr &&
          m.duration_mins
      )
      .reduce((sum, m) => sum + (m.duration_mins || 0), 0)

    return kiraMeetingsMins + calendarEventsMins
  }, [meetings, calendarEventsMins, today])

  const totalWorkedMins = operativaMins + meetingsMins

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

  const fmtTime = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-6">
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-0.5">{getGreeting()}, Alex</h2>
          <p className="text-xs md:text-sm text-muted-foreground capitalize">{formatDate(today)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] md:text-sm text-muted-foreground">Tasks</p>
          <p className="text-base md:text-lg font-semibold text-foreground">
            {completedToday}
            <span className="text-muted-foreground font-normal">/{plannedToday}</span>
          </p>
        </div>
      </div>

      {/* Three time metrics */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4">
        <div className="rounded-lg bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.1)] px-2.5 py-2 md:px-3">
          <p className="text-[10px] md:text-[11px] text-[#00D4FF]/70 uppercase tracking-wider">Total</p>
          <p className="text-sm md:text-base font-semibold font-mono text-[#00D4FF]">{fmtTime(totalWorkedMins)}</p>
        </div>
        <div className="rounded-lg bg-secondary/50 px-2.5 py-2 md:px-3">
          <p className="text-[10px] md:text-[11px] text-muted-foreground uppercase tracking-wider">Operativa</p>
          <p className="text-sm md:text-base font-semibold font-mono text-foreground">{fmtTime(operativaMins)}</p>
        </div>
        <div className="rounded-lg bg-secondary/50 px-2.5 py-2 md:px-3">
          <p className="text-[10px] md:text-[11px] text-muted-foreground uppercase tracking-wider">Meetings</p>
          <p className="text-sm md:text-base font-semibold font-mono text-foreground">{fmtTime(meetingsMins)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground">Progreso del día</span>
          <span className="text-[11px] font-mono text-foreground">
            {fmtTime(totalWorkedMins)} / {dailyGoalHours}h
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
