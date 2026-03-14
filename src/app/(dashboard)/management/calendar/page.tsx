'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay,
  startOfWeek, endOfWeek, isToday, isSameMonth, addDays,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
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

type CalendarView = 'month' | 'week' | 'day'

export default function CalendarPage() {
  useTasks()
  useMeetings()

  const tasks = useTaskStore((s) => s.tasks)
  const meetings = useMeetingStore((s) => s.meetings)
  const { openModal } = useUIStore()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [googleEvents, setGoogleEvents] = useState<Array<{ id: string; title: string; start: string }>>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [view, setView] = useState<CalendarView>('month')
  const detailsRef = useRef<HTMLDivElement>(null)

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
    } catch { /* ignore */ }
  }, [currentMonth])

  useEffect(() => { fetchGoogleEvents() }, [fetchGoogleEvents])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  // Week view days
  const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const events: CalendarEvent[] = []
    tasks
      .filter((t) => t.due_date && t.status !== 'deleted' && isSameDay(new Date(t.due_date), day))
      .forEach((t) => {
        events.push({
          id: `task-${t.id}`, title: t.title, start: t.due_date!, type: 'task',
          color: t.status === 'done' ? '#22c55e' : t.priority === 'q1' ? '#FF4444' : t.priority === 'q2' ? '#F5A623' : '#00D4FF',
          priority: t.priority,
        })
      })
    meetings
      .filter((m) => m.scheduled_at && m.status !== 'cancelled' && isSameDay(new Date(m.scheduled_at), day))
      .forEach((m) => {
        events.push({ id: `meeting-${m.id}`, title: m.title, start: m.scheduled_at!, type: 'meeting', color: '#8B5CF6' })
      })
    googleEvents
      .filter((e) => e.start && isSameDay(new Date(e.start), day))
      .forEach((e) => {
        const isDuplicate = meetings.some(
          (m) => m.calendar_event_id === e.id || (m.title === e.title && m.scheduled_at && isSameDay(new Date(m.scheduled_at), day))
        )
        if (!isDuplicate) {
          events.push({ id: `gcal-${e.id}`, title: e.title, start: e.start, type: 'google', color: '#4285F4' })
        }
      })
    return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }

  const prevPeriod = () => {
    if (view === 'month') setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    else if (view === 'week') setCurrentMonth(addDays(currentMonth, -7))
    else setCurrentMonth(addDays(currentMonth, -1))
  }
  const nextPeriod = () => {
    if (view === 'month') setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    else if (view === 'week') setCurrentMonth(addDays(currentMonth, 7))
    else setCurrentMonth(addDays(currentMonth, 1))
  }
  const goToday = () => setCurrentMonth(new Date())

  const handleDaySelect = (day: Date) => {
    setSelectedDay(day)
    // On mobile, scroll to details
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  const periodLabel = view === 'month'
    ? format(currentMonth, 'MMMM yyyy', { locale: es })
    : view === 'week'
    ? `${format(weekStart, "d MMM", { locale: es })} – ${format(addDays(weekStart, 6), "d MMM", { locale: es })}`
    : format(currentMonth, "EEEE d 'de' MMMM", { locale: es })

  const EventCard = ({ event }: { event: CalendarEvent }) => (
    <div className="rounded-lg border border-border bg-card p-3 hover:bg-secondary/50 transition-colors">
      <div className="flex items-start gap-2">
        <span className="h-2 w-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: event.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">{event.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground capitalize">
              {event.type === 'google' ? 'Google Cal' : event.type}
            </span>
            {event.start?.includes('T') && (
              <span className="text-[10px] text-muted-foreground">{format(new Date(event.start), 'HH:mm')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base md:text-lg font-semibold capitalize">{periodLabel}</h2>
          <div className="flex items-center gap-1">
            <button onClick={goToday} className="text-[11px] px-2 py-1 rounded border border-border hover:bg-secondary cursor-pointer">Hoy</button>
            <button onClick={prevPeriod} className="p-1 hover:bg-secondary rounded cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={nextPeriod} className="p-1 hover:bg-secondary rounded cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 mr-2">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[#00D4FF]" /> Tasks</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[#8B5CF6]" /> Meetings</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[#4285F4]" /> Google Cal</span>
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-0.5 bg-secondary rounded-lg">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                onClick={() => { setView(v); if (v === 'day') setSelectedDay(currentMonth) }}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer capitalize',
                  view === v ? 'bg-background text-[#00D4FF] shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* MONTH VIEW */}
          {view === 'month' && (
            <>
              <div className="grid grid-cols-7 mb-1">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] text-muted-foreground py-1.5 md:py-2 font-medium md:hidden">{d}</div>
                ))}
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                  <div key={d} className="text-center text-[10px] text-muted-foreground py-2 font-medium hidden md:block">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden">
                {days.map((day) => {
                  const dayEvents = getEventsForDay(day)
                  const inMonth = isSameMonth(day, currentMonth)
                  const isSelected = selectedDay && isSameDay(day, selectedDay)
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => handleDaySelect(day)}
                      className={cn(
                        'min-h-[52px] md:min-h-[90px] p-1 md:p-1.5 bg-card cursor-pointer transition-colors hover:bg-secondary/50',
                        !inMonth && 'opacity-30',
                        isSelected && 'ring-1 ring-[#00D4FF] ring-inset bg-[rgba(0,212,255,0.04)]'
                      )}
                    >
                      <span className={cn(
                        'text-[11px] inline-flex h-5 w-5 items-center justify-center rounded-full',
                        isToday(day) && 'bg-[#00D4FF] text-black font-medium'
                      )}>
                        {format(day, 'd')}
                      </span>
                      {/* Mobile: dots only */}
                      <div className="flex flex-wrap gap-0.5 mt-0.5 md:hidden">
                        {dayEvents.slice(0, 4).map((event) => (
                          <span key={event.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: event.color }} />
                        ))}
                        {dayEvents.length > 4 && <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 4}</span>}
                      </div>
                      {/* Desktop: dots + text */}
                      <div className="mt-1 space-y-0.5 hidden md:block">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div key={event.id} className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate">
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                            <span className="truncate">{event.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && <span className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* WEEK VIEW */}
          {view === 'week' && (
            <div className="space-y-1">
              {weekDays.map((day) => {
                const dayEvents = getEventsForDay(day)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDaySelect(day)}
                    className={cn(
                      'rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-secondary/30 transition-colors',
                      isToday(day) && 'border-[rgba(0,212,255,0.3)]',
                      isSelected && 'ring-1 ring-[#00D4FF]'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-sm font-medium capitalize',
                          isToday(day) && 'text-[#00D4FF]'
                        )}>
                          {format(day, 'EEEE d', { locale: es })}
                        </span>
                        {isToday(day) && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(0,212,255,0.1)] text-[#00D4FF]">Hoy</span>}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{dayEvents.length} eventos</span>
                    </div>
                    {dayEvents.length > 0 ? (
                      <div className="space-y-1">
                        {dayEvents.map((event) => (
                          <div key={event.id} className="flex items-center gap-2 text-xs">
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                            {event.start?.includes('T') && (
                              <span className="text-muted-foreground w-10 shrink-0">{format(new Date(event.start), 'HH:mm')}</span>
                            )}
                            <span className="truncate">{event.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Sin eventos</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* DAY VIEW */}
          {view === 'day' && (
            <div>
              {(() => {
                const dayEvents = getEventsForDay(currentMonth)
                return dayEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-muted-foreground mb-3">Sin eventos para este día</p>
                    <button
                      onClick={() => openModal('task-create')}
                      className="text-xs text-[#00D4FF] hover:underline cursor-pointer"
                    >
                      + Añadir evento
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayEvents.map((event) => <EventCard key={event.id} event={event} />)}
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* Sidebar: selected day details — desktop: side, mobile: below */}
        {view === 'month' && (
          <div ref={detailsRef} className="w-full md:w-[280px] md:shrink-0">
            <div className="md:sticky md:top-20">
              {selectedDay ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium capitalize">
                      {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                    </h3>
                    <button onClick={() => openModal('task-create')} className="p-1 rounded hover:bg-secondary cursor-pointer" title="Añadir">
                      <Plus className="h-4 w-4 text-[#00D4FF]" />
                    </button>
                  </div>
                  {selectedDayEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4">Sin eventos este día</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayEvents.map((event) => <EventCard key={event.id} event={event} />)}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 md:py-8 hidden md:block">
                  <p className="text-xs text-muted-foreground">Selecciona un día para ver los detalles</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
