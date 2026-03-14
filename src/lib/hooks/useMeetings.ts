'use client'

import { useEffect, useRef } from 'react'
import { useMeetingStore } from '@/stores/meetingStore'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/getUserId'
import { IS_DEMO, demoId } from '@/lib/demo'
import type { Meeting } from '@/types/meeting'

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
  }
}

function persistDemo() {
  if (!IS_DEMO) return
  localStorage.setItem('kira_demo_meetings', JSON.stringify(useMeetingStore.getState().meetings))
}

export function useMeetings() {
  const meetings = useMeetingStore((s) => s.meetings)
  const loading = useMeetingStore((s) => s.loading)

  const didFetch = useRef(false)
  useEffect(() => {
    if (didFetch.current) return
    didFetch.current = true
    fetchMeetingsData()
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
