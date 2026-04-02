'use client'

import { useMemo, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DayStatus } from '@/components/dashboard/DayStatus'
import { useTasks } from '@/lib/hooks/useTasks'
import { useTaskStore } from '@/stores/taskStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { Play, Plus, Sparkles, ArrowRight, Calendar, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDuration } from '@/lib/utils/time'
import { format, isToday as isTodayFn, isTomorrow, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import { useUIStore } from '@/stores/uiStore'
import { useTimer } from '@/lib/hooks/useTimer'
import { IS_DEMO } from '@/lib/demo'
import { PriorityDot } from '@/components/shared/PriorityDot'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  attendees?: string
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

// Animation variants
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
}

export default function DashboardPage() {
  useTasks()
  const { tasks, categories, projects } = useTaskStore()
  const { meetings } = useMeetingStore()
  const { openModal, openTimerFloat } = useUIStore()
  const { startTimer, activeSession } = useTimer()

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [summaryText, setSummaryText] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)

  useEffect(() => {
    if (IS_DEMO) return
    async function fetchCalendarEvents() {
      try {
        const now = new Date()
        const timeMax = new Date()
        timeMax.setDate(timeMax.getDate() + 7)
        const res = await fetch(`/api/calendar/events?timeMin=${now.toISOString()}&timeMax=${timeMax.toISOString()}`)
        if (!res.ok) return
        const data = await res.json()
        setCalendarEvents(data.events || [])
      } catch { /* ignore */ }
    }
    fetchCalendarEvents()
  }, [])

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
      if (data.summary) { setSummaryText(data.summary); setSummaryExpanded(true) }
    } catch { /* ignore */ }
    finally { setSummaryLoading(false) }
  }, [])

  useEffect(() => {
    if (IS_DEMO) return
    async function fetchSummary() {
      try {
        const res = await fetch('/api/ai/summary?period=daily')
        if (!res.ok) return
        const data = await res.json()
        const summaries = data.summaries || []
        if (summaries.length > 0 && Date.now() - new Date(summaries[0].updated_at).getTime() < TWO_HOURS_MS) {
          setSummaryText(summaries[0].content)
          return
        }
        generateSummary()
      } catch { /* ignore */ }
    }
    fetchSummary()
  }, [generateSummary])

  const calendarEventsMinsToday = useMemo(() => {
    const todayStr = new Date().toDateString()
    return calendarEvents
      .filter((e) => new Date(e.start).toDateString() === todayStr && new Date(e.end) <= new Date())
      .reduce((sum, e) => sum + Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000), 0)
  }, [calendarEvents])

  const todayCompleted = useMemo(() => {
    const today = new Date().toDateString()
    return tasks.filter((t) => t.status === 'done' && t.completed_at && new Date(t.completed_at).toDateString() === today)
  }, [tasks])

  const topTasks = useMemo(() => {
    const pOrder: Record<string, number> = { q1: 0, q2: 1, q3: 2, q4: 3 }
    return tasks
      .filter((t) => ['todo', 'in_progress'].includes(t.status))
      .sort((a, b) => (pOrder[a.priority || ''] ?? 4) - (pOrder[b.priority || ''] ?? 4))
      .slice(0, 4)
  }, [tasks])

  const nextMeetings = useMemo(() => {
    const now = new Date()
    const unified: UnifiedMeeting[] = []
    meetings.filter((m) => m.status === 'scheduled' && m.scheduled_at && new Date(m.scheduled_at) > now)
      .forEach((m) => unified.push({ id: m.id, title: m.title, dateTime: new Date(m.scheduled_at!), participants: m.participants, source: 'kira', durationMins: m.duration_mins }))
    calendarEvents.filter((e) => new Date(e.start) > now)
      .forEach((e) => unified.push({ id: e.id, title: e.title, dateTime: new Date(e.start), participants: e.attendees || null, source: 'gcal', durationMins: Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000) }))
    return unified.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()).slice(0, 5)
  }, [meetings, calendarEvents])

  const formatMeetingTime = (dt: Date) => {
    const diffMins = differenceInMinutes(dt, new Date())
    if (diffMins <= 0) return 'Ahora'
    if (diffMins < 60) return `En ${diffMins} min`
    if (isTodayFn(dt)) return `Hoy, ${format(dt, 'HH:mm')}`
    if (isTomorrow(dt)) return `Manana, ${format(dt, 'HH:mm')}`
    return format(dt, "EEE d, HH:mm", { locale: es })
  }

  // Empty state
  if (tasks.length === 0 && meetings.length === 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="h-20 w-20 rounded-full bg-[rgba(0,212,255,0.06)] flex items-center justify-center mb-6"
          animate={{ boxShadow: ['0 0 0 0 rgba(0,212,255,0)', '0 0 0 20px rgba(0,212,255,0)', '0 0 0 0 rgba(0,212,255,0)'] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Sparkles className="h-8 w-8 text-[#00D4FF]" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Bienvenido a KIRA</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xs">Tu centro de operaciones inteligente.</p>
        <motion.button
          onClick={() => openModal('task-create')}
          className="h-12 px-8 rounded-full bg-[#00D4FF] text-black font-semibold text-sm"
          whileHover={{ scale: 1.03, boxShadow: '0 0 24px rgba(0,212,255,0.5)' }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus className="h-4 w-4 inline mr-2" />
          Crear primera tarea
        </motion.button>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="pb-28 md:pb-8"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Hero */}
      <motion.div variants={fadeUp} className="pt-2 md:pt-4">
        <DayStatus dailyGoalHours={8} calendarEventsMins={calendarEventsMinsToday} />
      </motion.div>

      {/* Active session */}
      <AnimatePresence>
        {activeSession && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              onClick={openTimerFloat}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.12)] cursor-pointer"
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className="h-2.5 w-2.5 rounded-full bg-[#00D4FF]"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{activeSession.taskTitle}</p>
                <p className="text-[11px] text-muted-foreground">
                  {[activeSession.taskCategory, activeSession.taskProject].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span className="text-lg font-mono font-light text-[#00D4FF] tabular-nums" style={{ textShadow: '0 0 15px rgba(0,212,255,0.3)' }}>
                {(() => {
                  const h = Math.floor(activeSession.elapsedSecs / 3600)
                  const m = Math.floor((activeSession.elapsedSecs % 3600) / 60)
                  const s = activeSession.elapsedSecs % 60
                  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
                })()}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <motion.div variants={fadeUp} className="mt-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <motion.button
            onClick={() => openModal('task-create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#141414] hover:bg-[#1a1a1a] border border-[#222] text-sm font-medium text-foreground shrink-0 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="h-3.5 w-3.5 text-[#00D4FF]" />
            Nueva tarea
          </motion.button>
          <motion.button
            onClick={() => openModal('meeting-create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#141414] hover:bg-[#1a1a1a] border border-[#222] text-sm font-medium text-foreground shrink-0 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <Calendar className="h-3.5 w-3.5 text-[#8B5CF6]" />
            Nuevo meeting
          </motion.button>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Link
              href="/kira"
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#141414] hover:bg-[#1a1a1a] border border-[#222] text-sm font-medium text-foreground shrink-0 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#00D4FF]" />
              Hablar con KIRA
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Meetings — horizontal scroll cards */}
      {nextMeetings.length > 0 && (
        <motion.div variants={fadeUp} className="mt-7">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Proximos meetings</h3>
            <Link href="/management/meetings" className="text-[11px] text-[#00D4FF]/70 hover:text-[#00D4FF] transition-colors flex items-center gap-1">
              Todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
            <div className="flex gap-2.5" style={{ minWidth: 'min-content' }}>
              {nextMeetings.map((meeting, i) => {
                const minsUntil = differenceInMinutes(meeting.dateTime, new Date())
                const isImminent = minsUntil <= 15 && minsUntil > 0

                return (
                  <motion.div
                    key={`${meeting.source}-${meeting.id}`}
                    className={cn(
                      'w-[200px] md:w-[220px] shrink-0 rounded-2xl p-4 transition-all',
                      isImminent
                        ? 'bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.15)]'
                        : 'bg-[#111] border border-[#1e1e1e]'
                    )}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      <motion.span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: meeting.source === 'kira' ? '#8B5CF6' : '#4285F4' }}
                        animate={isImminent ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}}
                        transition={isImminent ? { duration: 2, repeat: Infinity } : {}}
                      />
                      <span className={cn('text-[11px] font-semibold', isImminent ? 'text-[#00D4FF]' : 'text-muted-foreground')}>
                        {formatMeetingTime(meeting.dateTime)}
                      </span>
                    </div>
                    <p className="text-[13px] font-medium text-foreground truncate leading-tight">{meeting.title}</p>
                    {meeting.participants && (
                      <p className="text-[11px] text-muted-foreground/70 mt-1.5 truncate">{meeting.participants}</p>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Focus tasks */}
      <motion.div variants={fadeUp} className="mt-7">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">En foco</h3>
          <Link href="/management/tasks" className="text-[11px] text-[#00D4FF]/70 hover:text-[#00D4FF] transition-colors flex items-center gap-1">
            Todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {topTasks.length === 0 ? (
          <motion.p variants={fadeIn} className="text-sm text-muted-foreground py-6 text-center">
            Todo al dia
          </motion.p>
        ) : (
          <div className="space-y-0.5">
            {topTasks.map((task, i) => {
              const cat = categories.find((c) => c.id === task.category_id)
              const proj = projects.find((p) => p.id === task.project_id)
              return (
                <motion.div
                  key={task.id}
                  className="group flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-[#141414] active:bg-[#181818] transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }}
                >
                  <PriorityDot priority={task.priority} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{task.title}</p>
                    {(cat || proj || task.estimated_mins) && (
                      <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
                        {[cat?.name, proj?.name, task.estimated_mins ? formatDuration(task.estimated_mins) : null].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation()
                      startTimer(task.id, task.title, cat?.name || '', proj?.name || '')
                    }}
                    className="md:opacity-0 md:group-hover:opacity-100 h-8 w-8 rounded-full bg-[rgba(0,212,255,0.08)] flex items-center justify-center text-[#00D4FF] cursor-pointer transition-opacity"
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,212,255,0.15)' }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Play className="h-3.5 w-3.5 ml-0.5" />
                  </motion.button>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Completed today */}
      <AnimatePresence>
        {todayCompleted.length > 0 && (
          <motion.div
            variants={fadeUp}
            className="mt-6"
            initial="hidden"
            animate="show"
          >
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              Completadas <span className="text-[#22C55A]">{todayCompleted.length}</span>
            </h3>
            <div className="space-y-0">
              {todayCompleted.slice(0, 4).map((task) => (
                <div key={task.id} className="flex items-center gap-2 py-1.5 px-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22C55A]/60" />
                  <span className="text-[13px] text-muted-foreground/50 line-through truncate flex-1">{task.title}</span>
                </div>
              ))}
              {todayCompleted.length > 4 && (
                <p className="text-[11px] text-muted-foreground/40 px-3 pt-1">+{todayCompleted.length - 4} mas</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Summary */}
      <motion.div variants={fadeUp} className="mt-7 mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => summaryText ? setSummaryExpanded(!summaryExpanded) : generateSummary()}
            className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors cursor-pointer"
          >
            <Sparkles className="h-3 w-3 text-[#00D4FF]" />
            Resumen KIRA
            {summaryText && (summaryExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
          </button>
          {summaryText && (
            <button onClick={generateSummary} disabled={summaryLoading} className="p-1 rounded-md hover:bg-secondary disabled:opacity-50 cursor-pointer">
              <RefreshCw className={cn('h-3 w-3 text-muted-foreground', summaryLoading && 'animate-spin')} />
            </button>
          )}
        </div>

        {summaryLoading && !summaryText && (
          <div className="py-3 flex items-center gap-2">
            <motion.div
              className="h-1.5 w-1.5 rounded-full bg-[#00D4FF]"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <p className="text-sm text-muted-foreground">Generando...</p>
          </div>
        )}

        {!summaryLoading && !summaryText && (
          <button onClick={generateSummary} className="mt-2 text-sm text-[#00D4FF]/70 hover:text-[#00D4FF] cursor-pointer transition-colors">
            Generar resumen
          </button>
        )}

        <AnimatePresence>
          {summaryText && summaryExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-3 text-[13px] text-foreground/70 leading-relaxed whitespace-pre-wrap rounded-2xl bg-[#0e0e0e] border border-[#1a1a1a] p-4">
                {summaryText}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
