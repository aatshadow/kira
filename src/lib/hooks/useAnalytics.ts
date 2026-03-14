'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO } from '@/lib/demo'
import { useTaskStore } from '@/stores/taskStore'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, eachDayOfInterval, eachWeekOfInterval } from 'date-fns'

export type DateRange = 'today' | 'week' | 'month' | 'custom'

export interface MeetingRecord {
  id: string
  title: string
  status: string
  duration_mins: number | null
  scheduled_at: string
  completed_at: string | null
  participants: unknown[] | null
}

export interface HabitRecord {
  id: string
  name: string
  frequency: string
  created_at: string
}

export interface HabitLogRecord {
  id: string
  habit_id: string
  logged_at: string
  completed: boolean
}

export interface TaskRecord {
  id: string
  title: string
  status: string
  priority: string | null
  estimated_mins: number | null
  created_at: string
  completed_at: string | null
  kira_score: number | null
  category_id: string | null
  project_id: string | null
}

export interface AnalyticsData {
  totalWorkedSecs: number
  totalMeetingSecs: number
  totalTimeSecs: number

  tasksCompleted: number
  tasksCreated: number
  tasksPending: number
  avgScore: number | null
  efficiencyRatio: number | null

  tasksOverTime: { label: string; created: number; completed: number }[]
  completionRate: number | null
  avgTimePerTaskSecs: number | null
  timeByPriority: { priority: string; secs: number }[]
  tasksByStatus: { status: string; count: number }[]
  topLongestTasks: { title: string; secs: number }[]

  timeByCategory: { name: string; secs: number }[]
  timeByProject: { name: string; secs: number }[]
  sessions: {
    id: string
    task_title: string
    category: string
    started_at: string
    net_secs: number
  }[]
  heatmap: { day: number; hour: number; secs: number }[]

  meetingsCompleted: number
  meetingsScheduled: number
  meetingsCancelled: number
  avgMeetingMins: number | null
  meetingsWithParticipants: number
  meetingsSolo: number
  meetings: MeetingRecord[]
  upcomingMeetings: MeetingRecord[]

  habitsTotal: number
  habitsCompletedToday: number
  habitsAdherence: number | null
  habits: HabitRecord[]
  habitLogs: HabitLogRecord[]
  habitCompletionRates: { habitId: string; name: string; rate: number; streak: number }[]
}

function emptyData(): AnalyticsData {
  return {
    totalWorkedSecs: 0,
    totalMeetingSecs: 0,
    totalTimeSecs: 0,
    tasksCompleted: 0,
    tasksCreated: 0,
    tasksPending: 0,
    avgScore: null,
    efficiencyRatio: null,
    tasksOverTime: [],
    completionRate: null,
    avgTimePerTaskSecs: null,
    timeByCategory: [],
    timeByProject: [],
    timeByPriority: [],
    tasksByStatus: [],
    topLongestTasks: [],
    sessions: [],
    heatmap: [],
    meetingsCompleted: 0,
    meetingsScheduled: 0,
    meetingsCancelled: 0,
    avgMeetingMins: null,
    meetingsWithParticipants: 0,
    meetingsSolo: 0,
    meetings: [],
    upcomingMeetings: [],
    habitsTotal: 0,
    habitsCompletedToday: 0,
    habitsAdherence: null,
    habits: [],
    habitLogs: [],
    habitCompletionRates: [],
  }
}

export function useAnalytics() {
  const [range, setRange] = useState<DateRange>('week')
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | null>(null)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = IS_DEMO ? null : createClient()

  const getDateBounds = useCallback(() => {
    const now = new Date()
    switch (range) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) }
      case 'week':
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
      case 'month':
        return { from: startOfMonth(now), to: endOfMonth(now) }
      case 'custom':
        return customRange || { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
    }
  }, [range, customRange])

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    const { from, to } = getDateBounds()

    if (IS_DEMO) {
      const tasks = useTaskStore.getState().tasks
      const completedInRange = tasks.filter(
        (t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= from && new Date(t.completed_at) <= to
      )
      const createdInRange = tasks.filter(
        (t) => new Date(t.created_at) >= from && new Date(t.created_at) <= to
      )
      const pending = tasks.filter((t) => !['done', 'deleted'].includes(t.status))

      const d = emptyData()
      d.tasksCompleted = completedInRange.length
      d.tasksCreated = createdInRange.length
      d.tasksPending = pending.length
      setData(d)
      setLoading(false)
      return
    }

    const [sessionsRes, tasksRes, , , meetingsRes, habitsRes, habitLogsRes] = await Promise.all([
      supabase!
        .from('timer_sessions')
        .select('*, tasks(title, category_id, project_id, priority, estimated_mins, categories(name), projects(name))')
        .eq('status', 'completed')
        .gte('started_at', from.toISOString())
        .lte('started_at', to.toISOString())
        .order('started_at', { ascending: false }),
      supabase!.from('tasks').select('*'),
      supabase!.from('categories').select('*'),
      supabase!.from('projects').select('*'),
      supabase!.from('meetings').select('*').order('scheduled_at', { ascending: false }),
      supabase!.from('habits').select('*'),
      supabase!.from('habit_logs').select('*')
        .gte('logged_at', from.toISOString())
        .lte('logged_at', to.toISOString()),
    ])

    const sessions = sessionsRes.data || []
    const allTasks = (tasksRes.data || []) as TaskRecord[]
    const meetings = (meetingsRes.data || []) as MeetingRecord[]
    const habits = (habitsRes.data || []) as HabitRecord[]
    const habitLogs = (habitLogsRes.data || []) as HabitLogRecord[]

    /* ---- TIME ---- */
    const totalWorkedSecs = sessions.reduce((acc: number, s: Record<string, unknown>) => acc + ((s.net_secs as number) || 0), 0)

    /* ---- TASKS ---- */
    const completedInRange = allTasks.filter(
      (t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= from && new Date(t.completed_at) <= to
    )
    const createdInRange = allTasks.filter(
      (t) => new Date(t.created_at) >= from && new Date(t.created_at) <= to
    )
    const pending = allTasks.filter((t) => !['done', 'deleted'].includes(t.status))

    /* Tasks over time */
    const tasksOverTime: { label: string; created: number; completed: number }[] = []
    if (range === 'month') {
      const weeks = eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 })
      weeks.forEach((weekStart) => {
        const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
        const label = `Sem ${format(weekStart, 'dd/MM')}`
        const created = allTasks.filter(t => { const d = new Date(t.created_at); return d >= weekStart && d <= wEnd }).length
        const completed = allTasks.filter(t => {
          if (t.status !== 'done' || !t.completed_at) return false
          const d = new Date(t.completed_at); return d >= weekStart && d <= wEnd
        }).length
        tasksOverTime.push({ label, created, completed })
      })
    } else {
      const days = eachDayOfInterval({ start: from, end: to })
      days.forEach((day) => {
        const dEnd = endOfDay(day)
        const dStart = startOfDay(day)
        const label = format(day, 'EEE')
        const created = allTasks.filter(t => { const d = new Date(t.created_at); return d >= dStart && d <= dEnd }).length
        const completed = allTasks.filter(t => {
          if (t.status !== 'done' || !t.completed_at) return false
          const d = new Date(t.completed_at); return d >= dStart && d <= dEnd
        }).length
        tasksOverTime.push({ label, created, completed })
      })
    }

    /* Completion rate */
    const totalRelevant = createdInRange.length + completedInRange.filter(t => !createdInRange.some(c => c.id === t.id)).length
    const completionRate = totalRelevant > 0 ? Math.round((completedInRange.length / totalRelevant) * 100) : null

    /* Avg time per task */
    const taskTimeMap: Record<string, number> = {}
    sessions.forEach((s: Record<string, unknown>) => {
      const taskId = s.task_id as string
      if (taskId) taskTimeMap[taskId] = (taskTimeMap[taskId] || 0) + ((s.net_secs as number) || 0)
    })
    const completedTaskTimes = completedInRange.filter(t => taskTimeMap[t.id]).map(t => taskTimeMap[t.id])
    const avgTimePerTaskSecs = completedTaskTimes.length > 0
      ? Math.round(completedTaskTimes.reduce((a, b) => a + b, 0) / completedTaskTimes.length)
      : null

    /* Tasks by status */
    const statusCounts: Record<string, number> = {}
    allTasks.forEach(t => { if (t.status !== 'deleted') statusCounts[t.status] = (statusCounts[t.status] || 0) + 1 })
    const tasksByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

    /* Top 5 longest tasks */
    const topLongestTasks = Object.entries(taskTimeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([taskId, secs]) => {
        const task = allTasks.find(t => t.id === taskId)
        return { title: task?.title || 'Unknown', secs }
      })

    /* Time by category */
    const catMap: Record<string, number> = {}
    sessions.forEach((s: Record<string, unknown>) => {
      const task = s.tasks as Record<string, unknown> | null
      const cat = task?.categories as Record<string, unknown> | null
      const name = (cat?.name as string) || 'Sin categoria'
      catMap[name] = (catMap[name] || 0) + ((s.net_secs as number) || 0)
    })

    /* Time by project */
    const projMap: Record<string, number> = {}
    sessions.forEach((s: Record<string, unknown>) => {
      const task = s.tasks as Record<string, unknown> | null
      const proj = task?.projects as Record<string, unknown> | null
      const name = (proj?.name as string) || 'Sin proyecto'
      projMap[name] = (projMap[name] || 0) + ((s.net_secs as number) || 0)
    })

    /* Time by priority */
    const prioMap: Record<string, number> = {}
    sessions.forEach((s: Record<string, unknown>) => {
      const task = s.tasks as Record<string, unknown> | null
      const prio = (task?.priority as string) || 'none'
      prioMap[prio] = (prioMap[prio] || 0) + ((s.net_secs as number) || 0)
    })

    /* Heatmap */
    const heatmapMap: Record<string, number> = {}
    sessions.forEach((s: Record<string, unknown>) => {
      const d = new Date(s.started_at as string)
      const key = `${d.getDay()}-${d.getHours()}`
      heatmapMap[key] = (heatmapMap[key] || 0) + ((s.net_secs as number) || 0)
    })

    /* Efficiency: (estimated / actual) * 100 -- 100% = perfect, >100% = faster */
    const completedWithEstimate = completedInRange.filter(t => t.estimated_mins)
    let efficiencyRatio: number | null = null
    if (completedWithEstimate.length > 0) {
      const totalEstimatedSecs = completedWithEstimate.reduce((acc, t) => acc + ((t.estimated_mins || 0) * 60), 0)
      const totalActualSecs = sessions
        .filter((s: Record<string, unknown>) => completedWithEstimate.some(t => t.id === (s.task_id as string)))
        .reduce((acc: number, s: Record<string, unknown>) => acc + ((s.net_secs as number) || 0), 0)
      efficiencyRatio = totalActualSecs > 0 ? Math.round((totalEstimatedSecs / totalActualSecs) * 100) : null
    }

    /* Avg score */
    const scored = completedInRange.filter(t => t.kira_score != null)
    const avgScore = scored.length > 0 ? Math.round(scored.reduce((a, t) => a + (t.kira_score || 0), 0) / scored.length) : null

    /* ---- MEETINGS ---- */
    const meetingsInRange = meetings.filter(m => {
      const d = new Date(m.scheduled_at); return d >= from && d <= to
    })
    const mCompleted = meetingsInRange.filter(m => m.status === 'completed')
    const mScheduled = meetingsInRange.filter(m => m.status === 'scheduled')
    const mCancelled = meetingsInRange.filter(m => m.status === 'cancelled')

    const totalMeetingSecs = mCompleted.reduce((acc, m) => acc + ((m.duration_mins || 0) * 60), 0)
    const avgMeetingMins = mCompleted.length > 0
      ? Math.round(mCompleted.reduce((acc, m) => acc + (m.duration_mins || 0), 0) / mCompleted.length)
      : null

    const meetingsWithParticipants = meetingsInRange.filter(m =>
      m.participants && Array.isArray(m.participants) && m.participants.length > 0
    ).length
    const meetingsSolo = meetingsInRange.length - meetingsWithParticipants

    const now = new Date()
    const upcomingMeetings = meetings
      .filter(m => new Date(m.scheduled_at) >= now && m.status === 'scheduled')
      .slice(0, 10)

    /* Google Calendar events */
    let calendarMeetingSecs = 0
    try {
      const res = await fetch(`/api/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`)
      if (res.ok) {
        const calEvents = await res.json()
        if (Array.isArray(calEvents)) {
          calEvents.forEach((ev: { start?: string; end?: string }) => {
            if (ev.start && ev.end) {
              const st = new Date(ev.start).getTime()
              const en = new Date(ev.end).getTime()
              if (!isNaN(st) && !isNaN(en) && en > st) calendarMeetingSecs += Math.round((en - st) / 1000)
            }
          })
        }
      }
    } catch {
      // Calendar API not available
    }

    const combinedMeetingSecs = totalMeetingSecs + calendarMeetingSecs
    const totalTimeSecs = totalWorkedSecs + combinedMeetingSecs

    /* ---- HABITS ---- */
    const todayStr = format(now, 'yyyy-MM-dd')
    const completedHabitLogs = habitLogs.filter(l => l.completed)
    const habitsCompletedToday = completedHabitLogs.filter(l =>
      format(new Date(l.logged_at), 'yyyy-MM-dd') === todayStr
    ).length

    const daysInRange = eachDayOfInterval({ start: from, end: to > now ? now : to }).length
    const expectedLogs = habits.length * daysInRange
    const habitsAdherence = expectedLogs > 0
      ? Math.round((completedHabitLogs.length / expectedLogs) * 100)
      : null

    const habitCompletionRates = habits.map(h => {
      const logs = habitLogs.filter(l => l.habit_id === h.id && l.completed)
      const rate = daysInRange > 0 ? Math.round((logs.length / daysInRange) * 100) : 0

      let streak = 0
      const allCompletedDates = habitLogs
        .filter(l => l.habit_id === h.id && l.completed)
        .map(l => format(new Date(l.logged_at), 'yyyy-MM-dd'))
        .sort()
        .reverse()

      const checkDate = new Date(now)
      for (let i = 0; i < 365; i++) {
        const dateStr = format(checkDate, 'yyyy-MM-dd')
        if (allCompletedDates.includes(dateStr)) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
      return { habitId: h.id, name: h.name, rate, streak }
    })

    setData({
      totalWorkedSecs,
      totalMeetingSecs: combinedMeetingSecs,
      totalTimeSecs,
      tasksCompleted: completedInRange.length,
      tasksCreated: createdInRange.length,
      tasksPending: pending.length,
      avgScore,
      efficiencyRatio,
      tasksOverTime,
      completionRate,
      avgTimePerTaskSecs,
      timeByCategory: Object.entries(catMap).map(([name, secs]) => ({ name, secs })),
      timeByProject: Object.entries(projMap).map(([name, secs]) => ({ name, secs })),
      timeByPriority: Object.entries(prioMap).map(([priority, secs]) => ({ priority, secs })),
      tasksByStatus,
      topLongestTasks,
      sessions: sessions.map((s: Record<string, unknown>) => {
        const task = s.tasks as Record<string, unknown> | null
        const cat = task?.categories as Record<string, unknown> | null
        return {
          id: s.id as string,
          task_title: (task?.title as string) || '',
          category: (cat?.name as string) || '',
          started_at: s.started_at as string,
          net_secs: (s.net_secs as number) || 0,
        }
      }),
      heatmap: Object.entries(heatmapMap).map(([key, secs]) => {
        const [day, hour] = key.split('-').map(Number)
        return { day, hour, secs }
      }),
      meetingsCompleted: mCompleted.length,
      meetingsScheduled: mScheduled.length,
      meetingsCancelled: mCancelled.length,
      avgMeetingMins,
      meetingsWithParticipants,
      meetingsSolo,
      meetings: meetingsInRange,
      upcomingMeetings,
      habitsTotal: habits.length,
      habitsCompletedToday,
      habitsAdherence,
      habits,
      habitLogs,
      habitCompletionRates,
    })
    setLoading(false)
  }, [supabase, getDateBounds, range]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return { data, loading, range, setRange, customRange, setCustomRange, refetch: fetchAnalytics }
}
