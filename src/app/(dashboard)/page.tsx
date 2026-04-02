'use client'

import { useMemo, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DayStatus } from '@/components/dashboard/DayStatus'
import { ControlCenterGrid } from '@/components/dashboard/ControlCenterGrid'
import { KiraOrb } from '@/components/dashboard/KiraOrb'
import { useTasks } from '@/lib/hooks/useTasks'
import { useMeetingStore } from '@/stores/meetingStore'
import { useUIStore } from '@/stores/uiStore'
import { useTimer } from '@/lib/hooks/useTimer'
import { IS_DEMO } from '@/lib/demo'
import { format, isToday as isTodayFn, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import { staggerContainer, fadeUp } from '@/lib/animations'
import { Video, Clock } from 'lucide-react'
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
  endTime?: Date
  participants: string | null
  source: 'kira' | 'gcal'
  durationMins: number | null
}

export default function DashboardPage() {
  useTasks()
  const { meetings } = useMeetingStore()
  const { openTimerFloat } = useUIStore()
  const { activeSession } = useTimer()

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    if (IS_DEMO) return
    async function fetchCalendarEvents() {
      try {
        const now = new Date()
        const timeMax = new Date()
        timeMax.setDate(timeMax.getDate() + 2)
        const res = await fetch(`/api/calendar/events?timeMin=${now.toISOString()}&timeMax=${timeMax.toISOString()}`)
        if (!res.ok) return
        const data = await res.json()
        setCalendarEvents(data.events || [])
      } catch { /* ignore */ }
    }
    fetchCalendarEvents()
  }, [])

  const calendarEventsMinsToday = useMemo(() => {
    const todayStr = new Date().toDateString()
    return calendarEvents
      .filter((e) => new Date(e.start).toDateString() === todayStr && new Date(e.end) <= new Date())
      .reduce((sum, e) => sum + Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000), 0)
  }, [calendarEvents])

  // All today's meetings (KIRA + Google Cal)
  const todayMeetings = useMemo(() => {
    const now = new Date()
    const todayStr = now.toDateString()
    const unified: UnifiedMeeting[] = []

    meetings
      .filter((m) => m.scheduled_at && new Date(m.scheduled_at).toDateString() === todayStr && m.status !== 'cancelled')
      .forEach((m) => unified.push({
        id: m.id, title: m.title, dateTime: new Date(m.scheduled_at!),
        participants: m.participants, source: 'kira', durationMins: m.duration_mins,
      }))

    calendarEvents
      .filter((e) => new Date(e.start).toDateString() === todayStr)
      .forEach((e) => {
        // Skip duplicates already in KIRA meetings
        if (unified.some((u) => u.title === e.title)) return
        unified.push({
          id: e.id, title: e.title, dateTime: new Date(e.start), endTime: new Date(e.end),
          participants: e.attendees || null, source: 'gcal',
          durationMins: Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000),
        })
      })

    return unified.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
  }, [meetings, calendarEvents])

  const formatMeetingTime = (dt: Date) => {
    const diffMins = differenceInMinutes(dt, new Date())
    if (diffMins <= 0 && diffMins > -60) return 'Ahora'
    return format(dt, 'HH:mm')
  }

  return (
    <motion.div
      className="px-5 pb-36 md:pb-8 md:px-8 max-w-[600px] mx-auto"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Today's Meetings Widget */}
      {todayMeetings.length > 0 && (
        <motion.div variants={fadeUp} className="pt-2 md:pt-4 mb-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Video className="h-3.5 w-3.5 text-[#3B82F6]" />
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Meetings hoy</h3>
            </div>
            <Link href="/management/meetings" className="text-[10px] text-[#00D4FF]/60 hover:text-[#00D4FF] transition-colors">
              Ver todos
            </Link>
          </div>
          <div className="space-y-1.5">
            {todayMeetings.map((meeting) => {
              const diffMins = differenceInMinutes(meeting.dateTime, new Date())
              const isNow = diffMins <= 0 && diffMins > -60
              const isNext = diffMins > 0 && diffMins <= 30

              return (
                <motion.div
                  key={`${meeting.source}-${meeting.id}`}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all ${
                    isNow
                      ? 'bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.15)]'
                      : isNext
                        ? 'bg-white/[0.03] border border-white/[0.08]'
                        : 'bg-white/[0.02] border border-transparent'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-[11px] font-mono text-muted-foreground w-[42px] shrink-0 tabular-nums">
                    {formatMeetingTime(meeting.dateTime)}
                  </span>
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: isNow ? '#00D4FF' : meeting.source === 'kira' ? '#8B5CF6' : '#4285F4' }}
                    animate={isNow ? { scale: [1, 1.5, 1], opacity: [1, 0.4, 1] } : {}}
                    transition={isNow ? { duration: 2, repeat: Infinity } : {}}
                  />
                  <span className="text-[12px] text-foreground truncate flex-1">{meeting.title}</span>
                  {meeting.durationMins && (
                    <span className="text-[10px] text-muted-foreground/50 shrink-0">{meeting.durationMins}m</span>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Status Island */}
      <motion.div variants={fadeUp}>
        <DayStatus dailyGoalHours={8} calendarEventsMins={calendarEventsMinsToday} />
      </motion.div>

      {/* Active session banner */}
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
              className="glass-card flex items-center gap-3 px-4 py-3.5 cursor-pointer"
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

      {/* Control Center Grid */}
      <motion.div variants={fadeUp} className="mt-5">
        <ControlCenterGrid />
      </motion.div>

      {/* KIRA Orb */}
      <KiraOrb />
    </motion.div>
  )
}
