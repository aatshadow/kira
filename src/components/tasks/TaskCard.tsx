'use client'

import { Play, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PriorityDot } from '@/components/shared/PriorityDot'
import { ScoreDisplay } from '@/components/shared/ScoreDisplay'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useUIStore } from '@/stores/uiStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTimer } from '@/lib/hooks/useTimer'
import { useTasks } from '@/lib/hooks/useTasks'
import { formatDuration } from '@/lib/utils/time'
import type { Task } from '@/types/task'
import { STATUS_LABELS } from '@/types/task'

interface TaskCardProps {
  task: Task
  variant?: 'list' | 'feed'
}

export function TaskCard({ task, variant = 'list' }: TaskCardProps) {
  const { openModal } = useUIStore()
  const { categories, projects } = useTaskStore()
  const { startTimer } = useTimer()
  const { deleteTask, editTask } = useTasks()

  const category = categories.find((c) => c.id === task.category_id)
  const project = projects.find((p) => p.id === task.project_id)

  const handleStart = () => {
    startTimer(task.id, task.title, category?.name || '', project?.name || '')
  }

  const handleEdit = () => {
    openModal('task-edit', { task })
  }

  const handleDelete = async () => {
    await deleteTask(task.id)
  }

  const handleStatusChange = async (status: string) => {
    if (status === 'done') {
      openModal('task-close', { taskId: task.id, totalSecs: 0 })
    } else {
      await editTask(task.id, { status: status as Task['status'] })
    }
  }

  if (variant === 'feed') {
    return (
      <div
        className={cn(
          'group relative rounded-lg border bg-card p-5 transition-all cursor-pointer',
          'border-border hover:border-muted-foreground/30 hover:-translate-y-0.5 hover:shadow-sm',
          task.status === 'done' && 'opacity-60'
        )}
        style={{
          borderLeftWidth: '3px',
          borderLeftColor: task.priority
            ? ({ q1: '#FF4444', q2: '#F5A623', q3: '#00D4FF', q4: '#444444' })[task.priority]
            : '#242424',
        }}
        onClick={handleEdit}
      >
        <div className="flex items-start justify-between mb-3">
          <h3
            className={cn(
              'text-sm font-medium text-foreground',
              task.status === 'done' && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </h3>
          <ScoreDisplay score={task.kira_score} />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {category && (
            <Badge variant="secondary" className="text-[10px]">
              {category.name}
            </Badge>
          )}
          {project && (
            <Badge variant="outline" className="text-[10px]">
              {project.name}
            </Badge>
          )}
          {task.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            {task.estimated_mins && <span>{formatDuration(task.estimated_mins)}</span>}
            {task.due_date && (
              <span>
                {new Date(task.due_date).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            )}
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {STATUS_LABELS[task.status]}
          </Badge>
        </div>

        {task.status !== 'done' && task.status !== 'deleted' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleStart()
            }}
            className="absolute top-4 right-4 sm:opacity-0 sm:group-hover:opacity-100 text-[#00D4FF] hover:text-[#00A8CC] transition-all cursor-pointer"
          >
            <Play className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  // List variant
  return (
    <div
      className={cn(
        'group flex items-center gap-3 py-3 px-0 border-b border-border/50 transition-all',
        'hover:bg-secondary hover:px-4 hover:rounded-md hover:border-transparent',
        task.status === 'done' && 'opacity-60'
      )}
    >
      <PriorityDot priority={task.priority} />

      <span
        className={cn(
          'flex-1 text-sm font-medium text-foreground cursor-pointer truncate',
          task.status === 'done' && 'line-through text-muted-foreground'
        )}
        onClick={handleEdit}
      >
        {task.title}
      </span>

      <div className="hidden sm:flex items-center gap-2">
        {task.tags?.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] text-muted-foreground">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-3 text-[11px] text-muted-foreground">
        {category && <span>{category.name}</span>}
        {project && <span className="text-muted-foreground/60">{project.name}</span>}
        {task.estimated_mins && <span>{formatDuration(task.estimated_mins)}</span>}
      </div>

      <ScoreDisplay score={task.kira_score} className="hidden lg:block" />

      <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
        {STATUS_LABELS[task.status]}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {task.status !== 'done' && task.status !== 'deleted' && (
          <button
            onClick={handleStart}
            className="p-1 text-[#00D4FF] hover:text-[#00A8CC] cursor-pointer"
            title="Iniciar timer"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Editar
            </DropdownMenuItem>
            {task.status !== 'done' && (
              <DropdownMenuItem onClick={() => handleStatusChange('done')}>
                Marcar como Done
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
