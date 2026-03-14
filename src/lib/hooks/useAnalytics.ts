'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO } from '@/lib/demo'
import { useTaskStore } from '@/stores/taskStore'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export type DateRange = 'today' | 'week' | 'month' | 'custom'

interface AnalyticsData {
  totalWorkedSecs: number
  tasksCompleted: number
  tasksCreated: number
  tasksPending: number
  avgScore: number | null
  efficiencyRatio: number | null
  timeByCategory: { name: string; secs: number }[]
  timeByProject: { name: string; secs: number }[]
  timeByPriority: { priority: string; secs: number }[]
  sessions: {
    id: string
    task_title: string
    category: string
    started_at: string
    net_secs: number
  }[]
  heatmap: { day: number; hour: number; secs: number }[]
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
      // In demo mode, compute analytics from local stores
      const tasks = useTaskStore.getState().tasks
      const categories = useTaskStore.getState().categories

      const completedInRange = tasks.filter(
        (t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= from && new Date(t.completed_at) <= to
      )
      const createdInRange = tasks.filter(
        (t) => new Date(t.created_at) >= from && new Date(t.created_at) <= to
      )
      const pending = tasks.filter((t) => !['done', 'deleted'].includes(t.status))

      // Build category map for names
      const catNameMap: Record<string, string> = {}
      categories.forEach((c) => { catNameMap[c.id] = c.name })

      setData({
        totalWorkedSecs: 0,
        tasksCompleted: completedInRange.length,
        tasksCreated: createdInRange.length,
        tasksPending: pending.length,
        avgScore: null,
        efficiencyRatio: null,
        timeByCategory: [],
        timeByProject: [],
        timeByPriority: [],
        sessions: [],
        heatmap: [],
      })
      setLoading(false)
      return
    }

    const [sessionsRes, tasksRes, categoriesRes, projectsRes] = await Promise.all([
      supabase!
        .from('timer_sessions')
        .select('*, tasks(title, category_id, project_id, priority, categories(name), projects(name))')
        .eq('status', 'completed')
        .gte('started_at', from.toISOString())
        .lte('started_at', to.toISOString())
        .order('started_at', { ascending: false }),
      supabase!.from('tasks').select('*'),
      supabase!.from('categories').select('*'),
      supabase!.from('projects').select('*'),
    ])

    const sessions = sessionsRes.data || []
    const tasks = tasksRes.data || []

    const totalWorkedSecs = sessions.reduce((acc: number, s: Record<string, unknown>) => acc + ((s.net_secs as number) || 0), 0)

    const completedInRange = tasks.filter(
      (t: Record<string, unknown>) => t.status === 'done' && t.completed_at && new Date(t.completed_at as string) >= from && new Date(t.completed_at as string) <= to
    )

    const createdInRange = tasks.filter(
      (t: Record<string, unknown>) => new Date(t.created_at as string) >= from && new Date(t.created_at as string) <= to
    )

    const pending = tasks.filter((t: Record<string, unknown>) => !['done', 'deleted'].includes(t.status as string))

    // Time by category
    const catMap: Record<string, number> = {}
    sessions.forEach((s: Record<string, unknown>) => {
      const task = s.tasks as Record<string, unknown> | null
      const cat = task?.categories as Record<string, unknown> | null
      const name = (cat?.name as string) || 'Sin categoría'
      catMap[name] = (catMap[name] || 0) + ((s.net_secs as number) || 0)
    })

    // Time by project
    const projMap: Record<string, number> = {}
    sessions.forEach((s: Record<string, unknown>) => {
      const task = s.tasks as Record<string, unknown> | null
      const proj = task?.projects as Record<string, unknown> | null
      const name = (proj?.name as string) || 'Sin proyecto'
      projMap[name] = (projMap[name] || 0) + ((s.net_secs as number) || 0)
    })

    // Time by priority
    const prioMap: Record<string, number> = {}
    sessions.forEach((s: Record<string, unknown>) => {
      const task = s.tasks as Record<string, unknown> | null
      const prio = (task?.priority as string) || 'none'
      prioMap[prio] = (prioMap[prio] || 0) + ((s.net_secs as number) || 0)
    })

    // Heatmap
    const heatmapMap: Record<string, number> = {}
    sessions.forEach((s: Record<string, unknown>) => {
      const d = new Date(s.started_at as string)
      const key = `${d.getDay()}-${d.getHours()}`
      heatmapMap[key] = (heatmapMap[key] || 0) + ((s.net_secs as number) || 0)
    })

    // Efficiency
    const completedWithEstimate = completedInRange.filter((t: Record<string, unknown>) => t.estimated_mins)
    let efficiencyRatio: number | null = null
    if (completedWithEstimate.length > 0) {
      const totalEstimated = completedWithEstimate.reduce((acc: number, t: Record<string, unknown>) => acc + ((t.estimated_mins as number) || 0) * 60, 0)
      const totalReal = sessions
        .filter((s: Record<string, unknown>) => completedWithEstimate.some((t: Record<string, unknown>) => t.id === (s as Record<string, unknown>).task_id))
        .reduce((acc: number, s: Record<string, unknown>) => acc + ((s.net_secs as number) || 0), 0)
      efficiencyRatio = totalEstimated > 0 ? Math.round((totalReal / totalEstimated) * 100) : null
    }

    // Avg score
    const scored = completedInRange.filter((t: Record<string, unknown>) => t.kira_score != null)
    const avgScore = scored.length > 0 ? Math.round(scored.reduce((a: number, t: Record<string, unknown>) => a + (t.kira_score as number), 0) / scored.length) : null

    setData({
      totalWorkedSecs,
      tasksCompleted: completedInRange.length,
      tasksCreated: createdInRange.length,
      tasksPending: pending.length,
      avgScore,
      efficiencyRatio,
      timeByCategory: Object.entries(catMap).map(([name, secs]) => ({ name, secs })),
      timeByProject: Object.entries(projMap).map(([name, secs]) => ({ name, secs })),
      timeByPriority: Object.entries(prioMap).map(([priority, secs]) => ({ priority, secs })),
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
    })
    setLoading(false)
  }, [supabase, getDateBounds]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return { data, loading, range, setRange, customRange, setCustomRange, refetch: fetchAnalytics }
}
