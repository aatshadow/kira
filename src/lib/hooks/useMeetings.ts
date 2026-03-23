'use client'

import { useEffect, useRef } from 'react'
import { useMeetingStore } from '@/stores/meetingStore'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/getUserId'
import { IS_DEMO, demoId } from '@/lib/demo'
import type { Meeting } from '@/types/meeting'

/**
 * Auto-complete meetings whose scheduled_at + duration has passed.
 * Runs once after fetch and then every 60s.
 */
async function autoCompletePastMeetings() {
  const store = useMeetingStore.getState()
  const now = new Date()

  const toComplete = store.meetings.filter((m) => {
    if (m.status !== 'scheduled' && m.status !== 'in_progress') return false
    if (!m.scheduled_at) return false
    const endTime = new Date(new Date(m.scheduled_at).getTime() + (m.duration_mins || 60) * 60000)
    return endTime <= now
  })

  if (toComplete.length === 0) return

  if (IS_DEMO) {
    for (const m of toComplete) {
      store.updateMeeting(m.id, { status: 'completed', updated_at: now.toISOString() })
    }
    localStorage.setItem('kira_demo_meetings', JSON.stringify(useMeetingStore.getState().meetings))
    return
  }

  const supabase = createClient()
  for (const m of toComplete) {
    await supabase.from('meetings').update({ status: 'completed', updated_at: now.toISOString() }).eq('id', m.id)
    store.updateMeeting(m.id, { status: 'completed', updated_at: now.toISOString() })
  }
}

async function fetchMeetingsData() {
  const store = useMeetingStore.getState()
  store.setLoading(true)

  try {
    if (IS_DEMO) {
      const saved = localStorage.getItem('kira_demo_meetings')
      if (saved) store.setMeetings(JSON.parse(saved))
      return
    }

    const supabase = createClient()
    const { data } = await supabase.from('meetings').select('*').order('scheduled_at', { ascending: false })
    if (data) store.setMeetings(data)
  } catch (err) {
    console.error('[KIRA] fetchMeetings error:', err)
  } finally {
    useMeetingStore.getState().setLoading(false)
    // Auto-complete past meetings after data is loaded
    autoCompletePastMeetings()
  }
}

function persistDemo() {
  if (!IS_DEMO) return
  localStorage.setItem('kira_demo_meetings', JSON.stringify(useMeetingStore.getState().meetings))
}

// --- Google Calendar helpers (fire-and-forget, non-blocking) ---

async function syncToGoogleCalendar(meeting: Meeting): Promise<string | null> {
  if (!meeting.scheduled_at) return null
  try {
    const end = meeting.duration_mins
      ? new Date(new Date(meeting.scheduled_at).getTime() + meeting.duration_mins * 60000).toISOString()
      : undefined

    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: meeting.title,
        start: meeting.scheduled_at,
        end,
        description: meeting.pre_notes || undefined,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return data.id || null // Google Calendar event ID
    }
  } catch {
    // Calendar not connected or error — skip silently
  }
  return null
}

async function deleteFromGoogleCalendar(calendarEventId: string): Promise<void> {
  try {
    await fetch('/api/calendar/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: calendarEventId }),
    })
  } catch {
    // Skip silently
  }
}

export function useMeetings() {
  const meetings = useMeetingStore((s) => s.meetings)
  const loading = useMeetingStore((s) => s.loading)

  const didFetch = useRef(false)
  useEffect(() => {
    if (didFetch.current) return
    didFetch.current = true
    fetchMeetingsData()

    // Check every 60s for meetings that should be auto-completed
    const interval = setInterval(autoCompletePastMeetings, 60_000)
    return () => clearInterval(interval)
  }, [])

  const createMeeting = async (data: Partial<Meeting>) => {
    if (IS_DEMO) {
      const meeting: Meeting = {
        id: demoId(),
        user_id: 'demo',
        title: data.title || '',
        scheduled_at: data.scheduled_at || null,
        duration_mins: data.duration_mins || null,
        participants: data.participants || null,
        status: 'scheduled',
        pre_notes: data.pre_notes || null,
        post_notes: null,
        transcript: null,
        ai_summary: null,
        calendar_event_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      useMeetingStore.getState().addMeeting(meeting)
      setTimeout(persistDemo, 0)
      return meeting
    }

    const supabase = createClient()
    const userId = await getUserId()
    const { data: meeting, error } = await supabase.from('meetings').insert({ ...data, user_id: userId }).select().single()
    if (error || !meeting) return null
    useMeetingStore.getState().addMeeting(meeting)

    // Sync to Google Calendar
    const gcalId = await syncToGoogleCalendar(meeting)
    if (gcalId) {
      await supabase.from('meetings').update({ calendar_event_id: gcalId }).eq('id', meeting.id)
      useMeetingStore.getState().updateMeeting(meeting.id, { calendar_event_id: gcalId })
    }

    return meeting
  }

  const editMeeting = async (id: string, data: Partial<Meeting>) => {
    if (IS_DEMO) {
      useMeetingStore.getState().updateMeeting(id, { ...data, updated_at: new Date().toISOString() })
      setTimeout(persistDemo, 0)
      return
    }

    const supabase = createClient()
    await supabase.from('meetings').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
    useMeetingStore.getState().updateMeeting(id, data)
  }

  const deleteMeeting = async (id: string) => {
    if (IS_DEMO) {
      useMeetingStore.getState().removeMeeting(id)
      setTimeout(persistDemo, 0)
      return
    }

    // Delete from Google Calendar if linked
    const meeting = useMeetingStore.getState().meetings.find(m => m.id === id)
    if (meeting?.calendar_event_id) {
      deleteFromGoogleCalendar(meeting.calendar_event_id)
    }

    const supabase = createClient()
    await supabase.from('meetings').delete().eq('id', id)
    useMeetingStore.getState().removeMeeting(id)
  }

  return {
    meetings,
    loading,
    createMeeting,
    editMeeting,
    deleteMeeting,
    refetch: fetchMeetingsData,
  }
}
