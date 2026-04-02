import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidGoogleToken } from '@/lib/google'

// GET — fetch transcript for a single meeting
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await getValidGoogleToken(supabase, user.id)
  if (!token) return NextResponse.json({ error: 'Google not connected' }, { status: 403 })

  const meetingId = new URL(request.url).searchParams.get('meetingId')
  if (!meetingId) return NextResponse.json({ error: 'meetingId required' }, { status: 400 })

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, title, calendar_event_id, transcript, status, scheduled_at')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single()

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  if (!meeting.calendar_event_id) return NextResponse.json({ error: 'No calendar event linked' }, { status: 400 })
  if (meeting.transcript) return NextResponse.json({ found: true, already_exists: true, meetingId })

  const transcript = await findTranscript(token, meeting.title, meeting.scheduled_at)
  if (!transcript) return NextResponse.json({ found: false, meetingId })

  await supabase
    .from('meetings')
    .update({ transcript, updated_at: new Date().toISOString() })
    .eq('id', meetingId)

  return NextResponse.json({ found: true, meetingId, transcript_length: transcript.length })
}

// POST — batch scan: find transcripts for all completed meetings without one
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await getValidGoogleToken(supabase, user.id)
  if (!token) return NextResponse.json({ error: 'Google not connected' }, { status: 403 })

  // Find completed meetings with a calendar link but no transcript
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, title, calendar_event_id, scheduled_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .not('calendar_event_id', 'is', null)
    .is('transcript', null)
    .order('scheduled_at', { ascending: false })
    .limit(5)

  if (!meetings || meetings.length === 0) {
    return NextResponse.json({ processed: 0, found: 0 })
  }

  let found = 0
  for (const meeting of meetings) {
    const transcript = await findTranscript(token, meeting.title, meeting.scheduled_at)
    if (transcript) {
      await supabase
        .from('meetings')
        .update({ transcript, updated_at: new Date().toISOString() })
        .eq('id', meeting.id)
      found++
    }
  }

  return NextResponse.json({ processed: meetings.length, found })
}

// --- Helper: search Google Drive for a meeting transcript ---
async function findTranscript(
  token: string,
  meetingTitle: string,
  scheduledAt: string | null
): Promise<string | null> {
  try {
    // Clean title for search (remove special chars)
    const cleanTitle = meetingTitle.replace(/[^\w\s]/g, '').trim()

    // Strategy 1: Search by meeting title
    const queries = [
      `name contains 'transcript' and name contains '${cleanTitle}' and mimeType='application/vnd.google-apps.document'`,
    ]

    // Strategy 2: Search by date if we have scheduled_at
    if (scheduledAt) {
      const date = new Date(scheduledAt)
      const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
      queries.push(
        `name contains 'transcript' and name contains '${dateStr}' and mimeType='application/vnd.google-apps.document'`
      )
      // Also try with localized date formats
      const day = date.getDate()
      const month = date.getMonth() + 1
      const year = date.getFullYear()
      queries.push(
        `name contains 'transcript' and name contains '${day}/${month}/${year}' and mimeType='application/vnd.google-apps.document'`
      )
    }

    // Strategy 3: Broader search — just "transcript" near the date
    if (scheduledAt) {
      const date = new Date(scheduledAt)
      const dayBefore = new Date(date.getTime() - 24 * 60 * 60 * 1000).toISOString()
      const dayAfter = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString()
      queries.push(
        `name contains 'transcript' and mimeType='application/vnd.google-apps.document' and createdTime >= '${dayBefore}' and createdTime <= '${dayAfter}'`
      )
    }

    for (const query of queries) {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
        `q=${encodeURIComponent(query)}&` +
        `fields=files(id,name,createdTime)&` +
        `orderBy=createdTime desc&` +
        `pageSize=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (!searchRes.ok) continue

      const searchData = await searchRes.json()
      const files = searchData.files || []

      if (files.length > 0) {
        // Export the first matching file as plain text
        const fileId = files[0].id
        const exportRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (exportRes.ok) {
          const text = await exportRes.text()
          // Truncate to 100K chars to stay within reasonable DB/AI limits
          return text.slice(0, 100_000)
        }
      }
    }

    return null
  } catch (err) {
    console.error('[KIRA] Transcript search error:', err)
    return null
  }
}
