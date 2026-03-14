'use client'

import { TaskCard } from './TaskCard'
import { KANBAN_COLUMNS } from '@/lib/constants'
import { useTasks } from '@/lib/hooks/useTasks'
import type { Task, TaskStatus } from '@/types/task'
import { cn } from '@/lib/utils'

interface TaskKanbanProps {
  tasks: Task[]
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

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div
          key={col.id}
          className="flex-shrink-0 w-[280px]"
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
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
