export type TimerSessionStatus = 'running' | 'paused' | 'completed'

export interface TimerSession {
  id: string
  user_id: string
  task_id: string
  started_at: string
  ended_at: string | null
  paused_at: string | null
  total_paused_secs: number
  net_secs: number | null
  status: TimerSessionStatus
  created_at: string
}

export interface ActiveTimer {
  id: string
  taskId: string
  taskTitle: string
  taskCategory: string
  taskProject: string
  startedAt: number // timestamp ms
  pausedAt: number | null
  totalPausedSecs: number
  status: 'running' | 'paused'
  elapsedSecs: number
}
