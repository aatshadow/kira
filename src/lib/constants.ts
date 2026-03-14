export const DEFAULT_CATEGORIES = [
  'Development',
  'Security',
  'Growth',
  'Admin',
  'Personal',
] as const

export const TASK_VIEWS = [
  { id: 'list', label: 'Lista' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'feed', label: 'Feed' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'category', label: 'Categoría' },
  { id: 'project', label: 'Proyecto' },
] as const

export const KANBAN_COLUMNS = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'done', label: 'Done' },
] as const
