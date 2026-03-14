export interface Profile {
  id: string
  name: string | null
  avatar_url: string | null
  daily_goal_hours: number
  weekly_goal_hours: number
  work_days: number[]
  theme: 'dark' | 'light'
  default_view: string
  created_at: string
  updated_at: string
}
