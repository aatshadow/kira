'use client'

import { useState } from 'react'
import { TaskCard } from './TaskCard'
import { KANBAN_COLUMNS } from '@/lib/constants'
import { useTasks } from '@/lib/hooks/useTasks'
import type { Task, TaskStatus } from '@/types/task'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

interface TaskKanbanProps {
  tasks: Task[]
}

function MobileStatusChanger({ task, onChangeStatus }: { task: Task; onChangeStatus: (id: string, status: TaskStatus) => void }) {
  const [open, setOpen] = useState(false)
  const currentIdx = KANBAN_COLUMNS.findIndex(c => c.id === task.status)

  return (
    <div className="md:hidden">
      {open ? (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
          {KANBAN_COLUMNS.map((col) => (
            <button
              key={col.id}
              onClick={(e) => {
                e.stopPropagation()
                onChangeStatus(task.id, col.id as TaskStatus)
                setOpen(false)
              }}
              className={cn(
                'flex-1 text-[9px] py-1.5 rounded-md transition-colors cursor-pointer text-center',
                col.id === task.status
                  ? 'bg-[rgba(0,212,255,0.1)] text-[#00D4FF] font-medium'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              )}
            >
              {col.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
          {currentIdx > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onChangeStatus(task.id, KANBAN_COLUMNS[currentIdx - 1].id as TaskStatus)
              }}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" />
              {KANBAN_COLUMNS[currentIdx - 1].label}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(true) }}
            className="px-2 py-1 rounded-md hover:bg-secondary cursor-pointer ml-auto"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {currentIdx < KANBAN_COLUMNS.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onChangeStatus(task.id, KANBAN_COLUMNS[currentIdx + 1].id as TaskStatus)
              }}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary cursor-pointer"
            >
              {KANBAN_COLUMNS[currentIdx + 1].label}
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function TaskKanban({ tasks }: TaskKanbanProps) {
  const { editTask } = useTasks()

  const columns = KANBAN_COLUMNS.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => t.status === col.id),
  }))

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId) {
      await editTask(taskId, { status })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId)
  }

  const handleChangeStatus = async (taskId: string, status: TaskStatus) => {
    await editTask(taskId, { status })
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
      {columns.map((col) => (
        <div
          key={col.id}
          className="flex-shrink-0 w-[260px] md:w-[280px]"
          onDrop={(e) => handleDrop(e, col.id as TaskStatus)}
          onDragOver={handleDragOver}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {col.label}
            </h3>
            <span className="text-[10px] text-muted-foreground/60">{col.tasks.length}</span>
          </div>

          <div
            className={cn(
              'space-y-2 min-h-[200px] rounded-lg p-2',
              'bg-secondary/30 border border-dashed border-transparent',
              'transition-colors'
            )}
          >
            {col.tasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                className="cursor-grab active:cursor-grabbing"
              >
                <TaskCard task={task} variant="feed" />
                <MobileStatusChanger task={task} onChangeStatus={handleChangeStatus} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
