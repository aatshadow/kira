import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Get users with Google tokens
  const { data: tokens } = await supabase
    .from('user_google_tokens')
    .select('user_id, access_token, refresh_token, expires_at')

  if (!tokens?.length) {
    return NextResponse.json({ message: 'No Google tokens found' })
  }

  let synced = 0

  for (const token of tokens) {
    try {
      let accessToken = token.access_token

      // Refresh if expired
      if (new Date(token.expires_at) < new Date()) {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: token.refresh_token,
            grant_type: 'refresh_token',
          }),
        })
        if (!refreshRes.ok) continue
        const refreshData = await refreshRes.json()
        accessToken = refreshData.access_token

        // Update stored token
        await supabase.from('user_google_tokens').update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        }).eq('user_id', token.user_id)
      }

      // Fetch upcoming events (next 7 days)
      const now = new Date()
      const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(now.toISOString())}&` +
        `timeMax=${encodeURIComponent(weekAhead.toISOString())}&` +
        `maxResults=50&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (!calRes.ok) continue
      const calData = await calRes.json()

      for (const event of (calData.items || [])) {
        const startTime = event.start?.dateTime || event.start?.date
        if (!startTime) continue

        // Upsert meeting by gcal_id
        await supabase.from('meetings').upsert({
          user_id: token.user_id,
          title: event.summary || 'Sin título',
          scheduled_at: startTime,
          duration_mins: event.end?.dateTime
            ? Math.round((new Date(event.end.dateTime).getTime() - new Date(startTime).getTime()) / 60000)
            : 60,
          participants: (event.attendees || []).map((a: { email: string }) => a.email).join(', '),
          status: 'scheduled',
          gcal_event_id: event.id,
        }, { onConflict: 'gcal_event_id', ignoreDuplicates: false })
      }

      synced++
    } catch (err) {
      console.error(`[CRON] Calendar sync failed for user ${token.user_id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, synced })
}
