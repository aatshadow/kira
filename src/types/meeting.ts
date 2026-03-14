export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface Meeting {
  id: string
  user_id: string
  title: string
  scheduled_at: string | null
  duration_mins: number | null
  participants: string | null
  status: MeetingStatus
  pre_notes: string | null
  post_notes: string | null
  transcript: string | null
  ai_summary: string | null
  calendar_event_id: string | null
  created_at: string
  updated_at: string
}
