import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidGoogleToken } from '@/lib/google'

const SYNC_COOLDOWN_MS = 2 * 60 * 1000 // 2 minutes

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = await getValidGoogleToken(supabase, user.id)
  if (!token) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 403 })
  }

  // Rate limit: check last sync time
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_calendar_sync')
    .eq('id', user.id)
    .single()

  if (profile?.last_calendar_sync) {
    const lastSync = new Date(profile.last_calendar_sync).getTime()
    if (Date.now() - lastSync < SYNC_COOLDOWN_MS) {
      return NextResponse.json({ synced: 0, updated: 0, skipped: true })
    }
  }

  // Fetch Google Calendar events: 7 days past → 14 days future
  const now = new Date()
  const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const timeMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&` +
      `timeMax=${encodeURIComponent(timeMax)}&` +
      `maxResults=250&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) {
      const err = await res.json()
      console.error('[KIRA] Google Calendar sync fetch error:', err)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: res.status })
    }

    const data = await res.json()
    const events = data.items || []

    // Get existing KIRA meetings with calendar_event_ids for deduplication
    const { data: existingMeetings } = await supabase
      .from('meetings')
      .select('id, calendar_event_id, source, updated_at')
      .eq('user_id', user.id)
      .not('calendar_event_id', 'is', null)

    const existingMap = new Map(
      (existingMeetings || []).map((m: { id: string; calendar_event_id: string; source: string; updated_at: string }) => [m.calendar_event_id, m])
    )

    let synced = 0
    let updated = 0

    for (const event of events) {
      // Skip cancelled Google events
      if (event.status === 'cancelled') continue

      // Skip all-day events (no dateTime = date-only event)
      const startDateTime = event.start?.dateTime
      if (!startDateTime) continue

      const calEventId = event.id as string
      const existing = existingMap.get(calEventId)

      // Skip if this is a KIRA-created meeting that was synced TO Google
      if (existing && (existing as { source: string }).source === 'kira') continue

      const endDateTime = event.end?.dateTime || startDateTime
      const startMs = new Date(startDateTime).getTime()
      const endMs = new Date(endDateTime).getTime()
      const durationMins = Math.round((endMs - startMs) / 60000)

      const attendees = (event.attendees || [])
        .map((a: { email?: string }) => a.email)
        .filter((e: string | undefined): e is string => !!e)
        .join(', ')

      const meetUrl = event.hangoutLink ||
        event.conferenceData?.entryPoints?.find((e: { entryPointType?: string }) => e.entryPointType === 'video')?.uri ||
        null

      const meetingStatus = endMs <= now.getTime() ? 'completed' : 'scheduled'

      const meetingData = {
        title: event.summary || '(Sin titulo)',
        scheduled_at: startDateTime,
        duration_mins: durationMins > 0 ? durationMins : null,
        participants: attendees || null,
        pre_notes: event.description ? String(event.description).slice(0, 2000) : null,
        calendar_event_id: calEventId,
        google_meet_url: meetUrl,
        source: 'google_calendar' as const,
        status: meetingStatus,
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        // Update existing Google-sourced meeting
        await supabase
          .from('meetings')
          .update(meetingData)
          .eq('id', (existing as { id: string }).id)
        updated++
      } else {
        // Insert new meeting
        await supabase
          .from('meetings')
          .insert({
            ...meetingData,
            user_id: user.id,
            created_at: new Date().toISOString(),
          })
        synced++
      }
    }

    // Update last sync timestamp
    await supabase
      .from('profiles')
      .update({ last_calendar_sync: new Date().toISOString() })
      .eq('id', user.id)

    return NextResponse.json({ synced, updated, total: events.length })
  } catch (err) {
    console.error('[KIRA] Calendar sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
