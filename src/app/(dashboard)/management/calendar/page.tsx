'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay,
  startOfWeek, endOfWeek, isToday, isSameMonth,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Circle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PriorityDot } from '@/components/shared/PriorityDot'
import { useTasks } from '@/lib/hooks/useTasks'
import { useTaskStore } from '@/stores/taskStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { useMeetings } from '@/lib/hooks/useMeetings'
import { useUIStore } from '@/stores/uiStore'

interface CalendarEvent {
  id: string
  title: string
  start: string
  type: 'task' | 'meeting' | 'google' | 'habit'
  color: string
  priority?: string | null
}

export default function CalendarPage() {
  useTasks()
  useMeetings()

  const tasks = useTaskStore((s) => s.tasks)
  const meetings = useMeetingStore((s) => s.meetings)
  const { openModal } = useUIStore()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [googleEvents, setGoogleEvents] = useState<Array<{ id: string; title: string; start: string }>>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Fetch Google Calendar events
  const fetchGoogleEvents = useCallback(async () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    try {
      const res = await fetch(
        `/api/calendar/events?timeMin=${monthStart.toISOString()}&timeMax=${monthEnd.toISOString()}`
      )
      if (res.ok) {
        const data = await res.json()
        setGoogleEvents(data.events || [])
      }
    } catch {
      // Google Calendar not connected or error
    }
  }, [currentMonth])

  useEffect(() => {
    fetchGoogleEvents()
  }, [fetchGoogleEvents])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  // Build unified events
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const events: CalendarEvent[] = []

    // Tasks with due date
    tasks
      .filter((t) => t.due_date && t.status !== 'deleted' && isSameDay(new Date(t.due_date), day))
      .forEach((t) => {
        events.push({
          id: `task-${t.id}`,
          title: t.title,
          start: t.due_date!,
          type: 'task',
          color: t.status === 'done' ? '#22c55e' : t.priority === 'q1' ? '#FF4444' : t.priority === 'q2' ? '#F5A623' : '#00D4FF',
          priority: t.priority,
        })
      })

    // Meetings
    meetings
      .filter((m) => m.scheduled_at && m.status !== 'cancelled' && isSameDay(new Date(m.scheduled_at), day))
      .forEach((m) => {
        events.push({
          id: `meeting-${m.id}`,
          title: m.title,
          start: m.scheduled_at!,
          type: 'meeting',
          color: '#8B5CF6',
        })
      })

    // Google Calendar events
    googleEvents
      .filter((e) => e.start && isSameDay(new Date(e.start), day))
      .forEach((e) => {
        // Skip if it matches an existing meeting (avoid duplicates)
        const isDuplicate = meetings.some(
          (m) => m.calendar_event_id === e.id || (m.title === e.title && m.scheduled_at && isSameDay(new Date(m.scheduled_at), day))
        )
        if (!isDuplicate) {
          events.push({
            id: `gcal-${e.id}`,
            title: e.title,
            start: e.start,
            type: 'google',
            color: '#4285F4',
          })
        }
      })

    return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  const goToday = () => setCurrentMonth(new Date())

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  return (
    <div className="flex gap-6">
      {/* Calendar grid */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          <div className="flex items-center gap-2">
            {/* Legend */}
            <div className="hidden lg:flex items-center gap-3 mr-4">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-[#00D4FF]" /> Tasks
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-[#8B5CF6]" /> Meetings
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-[#4285F4]" /> Google Cal
              </span>
            </div>
            <button onClick={goToday} className="text-[11px] px-2 py-1 rounded border border-border hover:bg-secondary cursor-pointer">
              Hoy
            </button>
            <button onClick={prevMonth} className="p-1 hover:bg-secondary rounded cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-secondary rounded cursor-pointer">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
            <div key={d} className="text-center text-[10px] text-muted-foreground py-2 font-medium">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day)
            const inMonth = isSameMonth(day, currentMonth)
            const isSelected = selectedDay && isSameDay(day, selectedDay)
            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'min-h-[90px] p-1.5 bg-card cursor-pointer transition-colors hover:bg-secondary/50',
                  !inMonth && 'opacity-30',
                  isSelected && 'ring-1 ring-[#00D4FF] ring-inset'
                )}
              >
                <span
                  className={cn(
                    'text-[11px] inline-flex h-5 w-5 items-center justify-center rounded-full',
                    isToday(day) && 'bg-[#00D4FF] text-black font-medium'
                  )}
                >
                  {format(day, 'd')}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: event.color }}
                      />
                      <span className="truncate">{event.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-muted-foreground px-1">
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sidebar: selected day details */}
      <div className="w-[280px] shrink-0">
        <div className="sticky top-20">
          {selectedDay ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">
                  {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                </h3>
                <button
                  onClick={() => openModal('task-create')}
                  className="p-1 rounded hover:bg-secondary cursor-pointer"
                  title="Añadir"
                >
                  <Plus className="h-4 w-4 text-[#00D4FF]" />
                </button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">Sin eventos este día</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-border bg-card p-3 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="h-2 w-2 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: event.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{event.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {event.type === 'google' ? 'Google Calendar' : event.type}
                            </span>
                            {event.start && event.start.includes('T') && (
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(event.start), 'HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">Selecciona un día para ver los detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
