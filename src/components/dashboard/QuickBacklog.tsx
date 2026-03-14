'use client'

import Link from 'next/link'
import { Play } from 'lucide-react'
import { useTaskStore } from '@/stores/taskStore'
import { useTimer } from '@/lib/hooks/useTimer'
import { PriorityDot } from '@/components/shared/PriorityDot'
import { formatDuration } from '@/lib/utils/time'

export function QuickBacklog() {
  const { tasks, categories, projects } = useTaskStore()
  const { startTimer } = useTimer()

  const topTasks = tasks
    .filter((t) => ['todo', 'backlog'].includes(t.status))
    .sort((a, b) => {
      const pOrder: Record<string, number> = { q1: 0, q2: 1, q3: 2, q4: 3 }
      return (pOrder[a.priority || ''] ?? 4) - (pOrder[b.priority || ''] ?? 4)
    })
    .slice(0, 5)

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Próximas
        </h3>
        <Link
          href="/tasks"
          className="text-[11px] text-[#00D4FF] hover:text-[#00A8CC] transition-colors"
        >
          Ver todas
        </Link>
      </div>

      {topTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No hay tasks pendientes</p>
      ) : (
        <div className="space-y-1">
          {topTasks.map((task) => {
            const cat = categories.find((c) => c.id === task.category_id)
            const proj = projects.find((p) => p.id === task.project_id)
            return (
              <div
                key={task.id}
                className="group flex items-center gap-2 py-2 px-2 rounded-md hover:bg-secondary transition-colors"
              >
                <PriorityDot priority={task.priority} />
                <span className="flex-1 text-sm text-foreground truncate">{task.title}</span>
                {task.estimated_mins && (
                  <span className="text-[11px] text-muted-foreground hidden sm:block">
                    {formatDuration(task.estimated_mins)}
                  </span>
                )}
                <button
                  onClick={() =>
                    startTimer(task.id, task.title, cat?.name || '', proj?.name || '')
                  }
                  className="opacity-0 group-hover:opacity-100 text-[#00D4FF] hover:text-[#00A8CC] transition-all cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
