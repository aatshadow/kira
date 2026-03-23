import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidGoogleToken } from '@/lib/google'

// GET — list calendar events
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = await getValidGoogleToken(supabase, user.id)
  if (!token) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const timeMin = searchParams.get('timeMin') || new Date().toISOString()
  const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const maxResults = searchParams.get('maxResults') || '250'

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&` +
      `timeMax=${encodeURIComponent(timeMax)}&` +
      `maxResults=${maxResults}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!res.ok) {
      const err = await res.json()
      console.error('[KIRA] Google Calendar API error:', err)
      return NextResponse.json({ error: 'Failed to fetch events', details: err.error?.message }, { status: res.status })
    }

    const data = await res.json()
    const events = (data.items || []).map((event: Record<string, unknown>) => ({
      id: event.id,
      title: (event.summary as string) || '(Sin título)',
      start: (event.start as Record<string, string>)?.dateTime || (event.start as Record<string, string>)?.date,
      end: (event.end as Record<string, string>)?.dateTime || (event.end as Record<string, string>)?.date,
      description: event.description || null,
      location: event.location || null,
      attendees: ((event.attendees as Array<Record<string, string>>) || []).map(a => a.email).join(', '),
      status: event.status,
      htmlLink: event.htmlLink,
    }))

    return NextResponse.json({ events })
  } catch (err) {
    console.error('[KIRA] Google Calendar error:', err)
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 })
  }
}

// DELETE — delete a calendar event
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = await getValidGoogleToken(supabase, user.id)
  if (!token) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 403 })
  }

  const { eventId } = await request.json()
  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (res.status === 204 || res.ok) {
      return NextResponse.json({ success: true })
    }

    const err = await res.json()
    return NextResponse.json({ error: 'Failed to delete event', details: err.error?.message }, { status: res.status })
  } catch (err) {
    console.error('[KIRA] Google Calendar delete error:', err)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}

// POST — create a calendar event
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = await getValidGoogleToken(supabase, user.id)
  if (!token) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 403 })
  }

  const { title, start, end, description, attendees } = await request.json()

  if (!title || !start) {
    return NextResponse.json({ error: 'Title and start time required' }, { status: 400 })
  }

  const event: Record<string, unknown> = {
    summary: title,
    start: { dateTime: start, timeZone: 'Europe/Madrid' },
    end: { dateTime: end || new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString(), timeZone: 'Europe/Madrid' },
  }

  if (description) event.description = description
  if (attendees) {
    event.attendees = attendees.split(',').map((email: string) => ({ email: email.trim() }))
  }

  try {
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: 'Failed to create event', details: err.error?.message }, { status: res.status })
    }

    const created = await res.json()
    return NextResponse.json({
      id: created.id,
      title: created.summary,
      start: created.start?.dateTime || created.start?.date,
      htmlLink: created.htmlLink,
    })
  } catch (err) {
    console.error('[KIRA] Google Calendar create error:', err)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
