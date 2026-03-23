'use client'

import { useMemo, useEffect, useState } from 'react'
import { CheckCircle2, Clock, CalendarCheck, Target, Timer, ListTodo } from 'lucide-react'
import { useTaskStore } from '@/stores/taskStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/getUserId'
import { IS_DEMO } from '@/lib/demo'

function fmtMins(mins: number) {
  if (mins <= 0) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

interface StatProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  accent?: boolean
}

function Stat({ icon: Icon, label, value, accent }: StatProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 min-w-0">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${accent ? 'text-[#00D4FF]' : 'text-muted-foreground'}`} />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none mb-0.5">{label}</p>
        <p className={`text-sm font-semibold font-mono leading-none ${accent ? 'text-[#00D4FF]' : 'text-foreground'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

export function DayStrip() {
  const { tasks } = useTaskStore()
  const { meetings } = useMeetingStore()
  const [workedMins, setWorkedMins] = useState(0)
  const [gcalMeetings, setGcalMeetings] = useState<{ count: number; mins: number }>({ count: 0, mins: 0 })

  const todayStr = new Date().toDateString()
  const todayDate = new Date().toISOString().split('T')[0]

  // Fetch Google Calendar events for today
  useEffect(() => {
    async function fetchGcalToday() {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      try {
        const res = await fetch(
          `/api/calendar/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`
        )
        if (!res.ok) return
        const data = await res.json()
        const events = data.events || []

        // Deduplicate: exclude events already linked to KIRA meetings
        const kiraMeetings = useMeetingStore.getState().meetings
        const filtered = events.filter((e: { id: string; title: string; start: string }) => {
          return !kiraMeetings.some(
            (m) => m.calendar_event_id === e.id ||
              (m.title === e.title && m.scheduled_at && new Date(m.scheduled_at).toDateString() === todayStr)
          )
        })

        let totalMins = 0
        filtered.forEach((e: { start?: string; end?: string }) => {
          if (e.start && e.end) {
            const s = new Date(e.start).getTime()
            const en = new Date(e.end).getTime()
            if (!isNaN(s) && !isNaN(en) && en > s) totalMins += Math.round((en - s) / 60000)
          }
        })

        setGcalMeetings({ count: filtered.length, mins: totalMins })
      } catch { /* ignore */ }
    }

    fetchGcalToday()
  }, [todayStr])

  // Fetch today's worked time from timer sessions
  useEffect(() => {
    if (IS_DEMO) return

    async function fetchWorkedTime() {
      const userId = await getUserId()
      if (!userId) return
      const supabase = createClient()
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)

      const { data } = await supabase
        .from('timer_sessions')
        .select('net_secs, task_id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString())

      if (!data) return

      // Use actual_mins from tasks when available, fallback to net_secs
      const taskSecsMap: Record<string, number> = {}
      data.forEach((s: { task_id: string | null; net_secs: number | null }) => {
        if (s.task_id) {
          taskSecsMap[s.task_id] = (taskSecsMap[s.task_id] || 0) + (s.net_secs || 0)
        }
      })

      let totalMins = 0
      const taskStore = useTaskStore.getState()
      for (const [taskId, timerSecs] of Object.entries(taskSecsMap)) {
        const task = taskStore.tasks.find(t => t.id === taskId)
        if (task?.actual_mins != null && task.actual_mins > 0) {
          // If task has manual time, prorate based on today's sessions vs total sessions
          // Simple approach: use timer secs for today's metric
          totalMins += Math.ceil(timerSecs / 60)
        } else {
          totalMins += Math.ceil(timerSecs / 60)
        }
      }

      setWorkedMins(totalMins)
    }

    fetchWorkedTime()
    const interval = setInterval(fetchWorkedTime, 60_000)
    return () => clearInterval(interval)
  }, [])

  const tasksDueToday = useMemo(() =>
    tasks.filter(t => t.due_date === todayDate && t.status !== 'deleted' && t.status !== 'done').length
  , [tasks, todayDate])

  const tasksCompletedToday = useMemo(() =>
    tasks.filter(t => t.status === 'done' && t.completed_at && new Date(t.completed_at).toDateString() === todayStr).length
  , [tasks, todayStr])

  const estimatedTodayMins = useMemo(() =>
    tasks
      .filter(t => t.due_date === todayDate && t.status !== 'deleted' && t.status !== 'done')
      .reduce((sum, t) => sum + (t.estimated_mins || 0), 0)
  , [tasks, todayDate])

  const meetingsToday = useMemo(() =>
    meetings.filter(m =>
      m.scheduled_at && new Date(m.scheduled_at).toDateString() === todayStr && m.status !== 'cancelled'
    ).length
  , [meetings, todayStr])

  const meetingsMinsToday = useMemo(() =>
    meetings
      .filter(m =>
        m.scheduled_at && new Date(m.scheduled_at).toDateString() === todayStr && m.status !== 'cancelled'
      )
      .reduce((sum, m) => sum + (m.duration_mins || 0), 0)
  , [meetings, todayStr])

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      <Stat icon={ListTodo} label="Para hoy" value={tasksDueToday} />
      <Stat icon={CheckCircle2} label="Completadas" value={tasksCompletedToday} />
      <Stat icon={Target} label="Estimado hoy" value={fmtMins(estimatedTodayMins)} />
      <Stat icon={Timer} label="Invertido hoy" value={fmtMins(workedMins)} accent />
      <Stat icon={CalendarCheck} label="Meetings" value={`${meetingsToday + gcalMeetings.count} · ${fmtMins(meetingsMinsToday + gcalMeetings.mins)}`} />
    </div>
  )
}
