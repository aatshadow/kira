'use client'

import { TaskCard } from './TaskCard'
import type { Task } from '@/types/task'

interface TaskFeedProps {
  tasks: Task[]
}

export function TaskFeed({ tasks }: TaskFeedProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} variant="feed" />
      ))}
    </div>
  )
}
