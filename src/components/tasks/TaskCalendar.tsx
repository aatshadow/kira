'use client'

import { useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameMonth,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PriorityDot } from '@/components/shared/PriorityDot'
import { useUIStore } from '@/stores/uiStore'
import type { Task } from '@/types/task'

interface TaskCalendarProps {
  tasks: Task[]
}

export function TaskCalendar({ tasks }: TaskCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { openModal } = useUIStore()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const tasksWithDate = tasks.filter((t) => t.due_date)
  const tasksWithoutDate = tasks.filter((t) => !t.due_date)

  const getTasksForDay = (day: Date) =>
    tasksWithDate.filter((t) => isSameDay(new Date(t.due_date!), day))

  const prevMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h3>
          <div className="flex gap-1">
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
            <div key={d} className="text-center text-[10px] text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden">
          {days.map((day) => {
            const dayTasks = getTasksForDay(day)
            const inMonth = isSameMonth(day, currentMonth)
            return (
              <div
                key={day.toISOString()}
                onClick={() => openModal('task-create', { dueDate: format(day, 'yyyy-MM-dd') })}
                className={cn(
                  'min-h-[80px] p-1.5 bg-card cursor-pointer transition-colors hover:bg-secondary',
                  !inMonth && 'opacity-30'
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
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        openModal('task-edit', { task })
                      }}
                      className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate hover:bg-muted cursor-pointer"
                    >
                      <PriorityDot priority={task.priority} size="sm" />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[10px] text-muted-foreground px-1">
                      +{dayTasks.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sidebar: tasks without date */}
      {tasksWithoutDate.length > 0 && (
        <div className="w-[200px] shrink-0">
          <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Sin fecha
          </h4>
          <div className="space-y-1">
            {tasksWithoutDate.slice(0, 10).map((task) => (
              <div
                key={task.id}
                onClick={() => openModal('task-edit', { task })}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary cursor-pointer"
              >
                <PriorityDot priority={task.priority} size="sm" />
                <span className="text-xs truncate">{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
