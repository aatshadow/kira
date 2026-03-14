'use client'

import { useMemo, useEffect, useState, useCallback } from 'react'
import { DayStatus } from '@/components/dashboard/DayStatus'
import { ActiveSession } from '@/components/dashboard/ActiveSession'
import { QuickBacklog } from '@/components/dashboard/QuickBacklog'
import { useTasks } from '@/lib/hooks/useTasks'
import { useTaskStore } from '@/stores/taskStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { Clock, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDuration } from '@/lib/utils/time'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useUIStore } from '@/stores/uiStore'
import { IS_DEMO } from '@/lib/demo'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  attendees?: { email: string; displayName?: string }[]
}

interface UnifiedMeeting {
  id: string
  title: string
  dateTime: Date
  participants: string | null
  source: 'kira' | 'gcal'
  durationMins: number | null
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

export default function DashboardPage() {
  useTasks()
  const { tasks } = useTaskStore()
  const { meetings } = useMeetingStore()
  const { openModal } = useUIStore()

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])

  // Daily summary state
  const [summaryText, setSummaryText] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)

  // Fetch Google Calendar events
  useEffect(() => {
    if (IS_DEMO) return

    async function fetchCalendarEvents() {
      try {
        const now = new Date()
        const timeMax = new Date()
        timeMax.setDate(timeMax.getDate() + 7)

        const params = new URLSearchParams({
          timeMin: now.toISOString(),
          timeMax: timeMax.toISOString(),
        })

        const res = await fetch(`/api/calendar/events?${params}`)
        if (!res.ok) return
        const data = await res.json()
        setCalendarEvents(data.events || [])
      } catch {
        // Calendar not connected - silently ignore
      }
    }

    fetchCalendarEvents()
  }, [])

  // Generate daily summary via POST
  const generateSummary = useCallback(async () => {
    if (IS_DEMO) return
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: 'daily' }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.summary) {
        setSummaryText(data.summary)
        setSummaryExpanded(true)
      }
    } catch {
      // Silently ignore
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  // Fetch existing daily summary on mount, auto-generate if stale
  useEffect(() => {
    if (IS_DEMO) return

    async function fetchSummary() {
      try {
        const res = await fetch('/api/ai/summary?period=daily')
        if (!res.ok) return
        const data = await res.json()
        const summaries = data.summaries || []

        if (summaries.length > 0) {
          const latest = summaries[0]
          const updatedAt = new Date(latest.updated_at).getTime()
          const now = Date.now()

          if (now - updatedAt < TWO_HOURS_MS) {
            setSummaryText(latest.content)
            return
          }
        }

        // No summary or stale - auto-generate
        generateSummary()
      } catch {
        // Silently ignore
      }
    }

    fetchSummary()
  }, [generateSummary])

  // Calculate calendar events duration for today (for DayStatus)
  const calendarEventsMinsToday = useMemo(() => {
    const todayStr = new Date().toDateString()
    return calendarEvents
      .filter((e) => new Date(e.start).toDateString() === todayStr && new Date(e.end) <= new Date())
      .reduce((sum, e) => {
        const durationMs = new Date(e.end).getTime() - new Date(e.start).getTime()
        return sum + Math.round(durationMs / 60000)
      }, 0)
  }, [calendarEvents])

  const todayCompleted = useMemo(() => {
    const today = new Date().toDateString()
    return tasks.filter(
      (t) => t.status === 'done' && t.completed_at && new Date(t.completed_at).toDateString() === today
    )
  }, [tasks])

  // Combine KIRA meetings + Google Calendar events, sorted, next 3
  const nextMeetings = useMemo(() => {
    const now = new Date()
    const unified: UnifiedMeeting[] = []

    // KIRA meetings
    meetings
      .filter((m) => m.status === 'scheduled' && m.scheduled_at && new Date(m.scheduled_at) > now)
      .forEach((m) => {
        unified.push({
          id: m.id,
          title: m.title,
          dateTime: new Date(m.scheduled_at!),
          participants: m.participants,
          source: 'kira',
          durationMins: m.duration_mins,
        })
      })

    // Google Calendar events
    calendarEvents
      .filter((e) => new Date(e.start) > now)
      .forEach((e) => {
        const durationMs = new Date(e.end).getTime() - new Date(e.start).getTime()
        const attendeeNames = e.attendees
          ?.map((a) => a.displayName || a.email)
          .join(', ')

        unified.push({
          id: e.id,
          title: e.title,
          dateTime: new Date(e.start),
          participants: attendeeNames || null,
          source: 'gcal',
          durationMins: Math.round(durationMs / 60000),
        })
      })

    return unified.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()).slice(0, 3)
  }, [meetings, calendarEvents])

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
    <div className="py-2 md:py-8 space-y-3 md:space-y-6">
      <DayStatus dailyGoalHours={8} calendarEventsMins={calendarEventsMinsToday} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        <div className="lg:col-span-2">
          <ActiveSession />
        </div>
        <div>
          <QuickBacklog />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        {/* Completed today */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-5">
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

        {/* Next 3 meetings */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Próximos meetings
          </h3>
          {nextMeetings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Sin meetings programados</p>
          ) : (
            <div className="space-y-3">
              {nextMeetings.map((meeting) => (
                <div key={`${meeting.source}-${meeting.id}`} className="flex items-start gap-3 py-1">
                  <span
                    className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: meeting.source === 'kira' ? '#A855F7' : '#3B82F6',
                    }}
                    title={meeting.source === 'kira' ? 'KIRA Meeting' : 'Google Calendar'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{meeting.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(meeting.dateTime, "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                      {meeting.durationMins && (
                        <span className="text-muted-foreground/60"> · {formatDuration(meeting.durationMins)}</span>
                      )}
                    </p>
                    {meeting.participants && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                        {meeting.participants}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily summary */}
      <div className="rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Resumen del día
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={generateSummary}
              disabled={summaryLoading}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
              title="Regenerar resumen"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${summaryLoading ? 'animate-spin' : ''}`} />
            </button>
            {summaryText && (
              <button
                onClick={() => setSummaryExpanded(!summaryExpanded)}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors cursor-pointer"
              >
                {summaryExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        </div>

        {summaryLoading && !summaryText && (
          <div className="py-4 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#00D4FF] animate-pulse" />
            <p className="text-sm text-muted-foreground">Generando resumen con IA...</p>
          </div>
        )}

        {!summaryLoading && !summaryText && (
          <p className="text-sm text-muted-foreground py-2">
            Sin resumen disponible.{' '}
            <button
              onClick={generateSummary}
              className="text-[#00D4FF] hover:underline cursor-pointer"
            >
              Generar ahora
            </button>
          </p>
        )}

        {summaryText && summaryExpanded && (
          <div className="mt-2 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {summaryText}
          </div>
        )}

        {summaryText && !summaryExpanded && (
          <button
            onClick={() => setSummaryExpanded(true)}
            className="mt-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {summaryText.slice(0, 120).trim()}...
          </button>
        )}
      </div>
    </div>
  )
}
