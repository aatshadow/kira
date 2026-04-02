import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, last_calendar_sync')
    .eq('id', user.id)
    .single()

  const hasGoogleToken = !!(profile?.google_access_token || profile?.google_refresh_token)

  // Validate Google token if we have one
  let googleValid = false
  if (hasGoogleToken && profile?.google_access_token) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${profile.google_access_token}`
      )
      googleValid = res.ok
    } catch {
      googleValid = false
    }
  }
  // If access token is invalid but we have a refresh token, still consider it "connected"
  if (!googleValid && profile?.google_refresh_token) {
    googleValid = true
  }

  return NextResponse.json({
    google_calendar: {
      connected: googleValid,
      last_sync: profile?.last_calendar_sync || null,
    },
    google_drive: {
      connected: googleValid, // Same OAuth, drive scope included
    },
    whatsapp: { connected: false },
    notion: { connected: false },
    gmail: { connected: false },
  })
}
