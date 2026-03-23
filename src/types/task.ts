export type Priority = 'q1' | 'q2' | 'q3' | 'q4'
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'waiting' | 'done' | 'deleted'

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  category_id: string | null
  project_id: string | null
  priority: Priority | null
  status: TaskStatus
  estimated_mins: number | null
  due_date: string | null
  tags: string[]
  kira_score: number | null
  notes: string | null
  difficulty: 'easier' | 'as_expected' | 'harder' | null
  post_notes: string | null
  meeting_id: string | null
  parent_task_id: string | null
  actual_mins: number | null
  sort_order: number
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface Category {
  id: string
  user_id: string
  name: string
  is_default: boolean
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  category_id: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  q1: 'Urgente + Importante',
  q2: 'Importante, No Urgente',
  q3: 'Urgente, No Importante',
  q4: 'No Urgente, No Importante',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  q1: '#FF4444',
  q2: '#F5A623',
  q3: '#00D4FF',
  q4: '#444444',
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  done: 'Done',
  deleted: 'Deleted',
}
