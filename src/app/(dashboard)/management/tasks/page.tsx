'use client'

import { useMemo } from 'react'
import { Plus, Search, List, Columns3, LayoutGrid, Calendar, FolderKanban, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskKanban } from '@/components/tasks/TaskKanban'
import { TaskFeed } from '@/components/tasks/TaskFeed'
import { TaskCalendar } from '@/components/tasks/TaskCalendar'
import { EmptyState } from '@/components/shared/EmptyState'
import { useTasks } from '@/lib/hooks/useTasks'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const viewIcons = {
  list: List, kanban: Columns3, feed: LayoutGrid, calendar: Calendar, category: Layers, project: FolderKanban,
} as const
const viewLabels = {
  list: 'Lista', kanban: 'Kanban', feed: 'Feed', calendar: 'Calendario', category: 'Categoría', project: 'Proyecto',
} as const

export default function ManagementTasksPage() {
  useTasks()
  const { tasks, categories, projects, view, filters, setView, setFilter } = useTaskStore()
  const { openModal } = useUIStore()

  const today = new Date().toISOString().split('T')[0]

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((t) => t.status !== 'deleted')
    if (filters.status.length > 0) {
      if (filters.status.includes('overdue')) {
        // Special filter: overdue = past due_date + not done
        result = result.filter((t) => t.due_date && t.due_date < today && t.status !== 'done')
      } else {
        result = result.filter((t) => filters.status.includes(t.status))
      }
    }
    if (filters.category.length > 0) result = result.filter((t) => t.category_id && filters.category.includes(t.category_id))
    if (filters.project) result = result.filter((t) => t.project_id === filters.project)
    if (filters.priority.length > 0) result = result.filter((t) => t.priority && filters.priority.includes(t.priority))
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.tags?.some((tag) => tag.toLowerCase().includes(q)))
    }
    return result
  }, [tasks, filters, today])

  const overdueCount = useMemo(() =>
    tasks.filter((t) => t.status !== 'deleted' && t.status !== 'done' && t.due_date && t.due_date < today).length
  , [tasks, today])

  const renderGroupedView = (groupBy: 'category' | 'project') => {
    const groups = groupBy === 'category'
      ? categories.map((c) => ({ id: c.id, name: c.name, tasks: filteredTasks.filter((t) => t.category_id === c.id) }))
      : projects.map((p) => ({ id: p.id, name: p.name, tasks: filteredTasks.filter((t) => t.project_id === p.id) }))
    const ungrouped = filteredTasks.filter((t) => (groupBy === 'category' ? !t.category_id : !t.project_id))

    return (
      <div className="space-y-6">
        {groups.filter((g) => g.tasks.length > 0).map((group) => (
          <div key={group.id}>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">{group.name} ({group.tasks.length})</h3>
            {group.tasks.map((task) => (<div key={task.id}><TaskList tasks={[task]} /></div>))}
          </div>
        ))}
        {ungrouped.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Sin {groupBy === 'category' ? 'categoría' : 'proyecto'} ({ungrouped.length})</h3>
            <TaskList tasks={ungrouped} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button onClick={() => openModal('task-create')} className="bg-[#00D4FF] text-black hover:bg-[#00A8CC] hover:shadow-[0_0_8px_rgba(0,212,255,0.4)]">
          <Plus className="h-4 w-4 mr-1" /> Nueva task
        </Button>
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          {(Object.keys(viewIcons) as Array<keyof typeof viewIcons>).map((v) => {
            const Icon = viewIcons[v]
            return (
              <button key={v} onClick={() => setView(v)} className={cn('p-2 transition-colors cursor-pointer', view === v ? 'bg-[rgba(0,212,255,0.08)] text-[#00D4FF]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary')} title={viewLabels[v]}>
                <Icon className="h-4 w-4" />
              </button>
            )
          })}
        </div>
        <Select value={filters.priority.length > 0 ? filters.priority[0] : 'all'} onValueChange={(v) => setFilter('priority', !v || v === 'all' ? [] as string[] : [v])}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="q1">Q1 — Urgente+Imp</SelectItem>
            <SelectItem value="q2">Q2 — Importante</SelectItem>
            <SelectItem value="q3">Q3 — Urgente</SelectItem>
            <SelectItem value="q4">Q4 — Baja</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.status.length > 0 ? filters.status[0] : 'all'} onValueChange={(v) => setFilter('status', !v || v === 'all' ? [] as string[] : [v])}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="overdue">Pasadas ({overdueCount})</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar..." value={filters.search} onChange={(e) => setFilter('search', e.target.value)} className="pl-9 h-9 w-[200px] text-xs bg-secondary" />
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState icon={List} title="Tu backlog está vacío" description="Añade tasks para empezar a gestionar tu tiempo" actionLabel="+ Nueva task" onAction={() => openModal('task-create')} />
      ) : (
        <>
          {view === 'list' && <TaskList tasks={filteredTasks} />}
          {view === 'kanban' && <TaskKanban tasks={filteredTasks} />}
          {view === 'feed' && <TaskFeed tasks={filteredTasks} />}
          {view === 'calendar' && <TaskCalendar tasks={filteredTasks} />}
          {view === 'category' && renderGroupedView('category')}
          {view === 'project' && renderGroupedView('project')}
        </>
      )}
    </div>
  )
}
