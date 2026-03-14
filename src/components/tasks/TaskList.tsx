'use client'

import { TaskCard } from './TaskCard'
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/types/task'
import type { Task, Priority } from '@/types/task'

interface TaskListProps {
  tasks: Task[]
}

export function TaskList({ tasks }: TaskListProps) {
  const priorities: Priority[] = ['q1', 'q2', 'q3', 'q4']

  const grouped = priorities.reduce(
    (acc, p) => {
      acc[p] = tasks.filter((t) => t.priority === p)
      return acc
    },
    {} as Record<Priority, Task[]>
  )

  const unassigned = tasks.filter((t) => !t.priority)

  return (
    <div className="space-y-6">
      {priorities.map((p) => {
        const group = grouped[p]
        if (group.length === 0) return null
        return (
          <div key={p}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: PRIORITY_COLORS[p] }}
              />
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {PRIORITY_LABELS[p]} ({group.length})
              </h3>
            </div>
            <div>
              {group.map((task) => (
                <TaskCard key={task.id} task={task} variant="list" />
              ))}
            </div>
          </div>
        )
      })}

      {unassigned.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Sin prioridad ({unassigned.length})
          </h3>
          <div>
            {unassigned.map((task) => (
              <TaskCard key={task.id} task={task} variant="list" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
