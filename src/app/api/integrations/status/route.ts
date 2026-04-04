import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch Google OAuth tokens
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, last_calendar_sync')
    .eq('id', user.id)
    .single()

  const hasGoogleToken = !!(profile?.google_access_token || profile?.google_refresh_token)

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
  if (!googleValid && profile?.google_refresh_token) {
    googleValid = true
  }

  // Fetch user API keys
  const { data: apiKeys } = await supabase
    .from('user_api_keys')
    .select('service, is_valid, updated_at')
    .eq('user_id', user.id)

  const keyMap: Record<string, { connected: boolean; updated_at: string | null }> = {}
  for (const k of (apiKeys || [])) {
    keyMap[k.service] = { connected: k.is_valid, updated_at: k.updated_at }
  }

  // Check Mac daemon status
  const { data: macSession } = await supabase
    .from('kira_mac_sessions')
    .select('last_heartbeat, capabilities')
    .eq('user_id', user.id)
    .order('last_heartbeat', { ascending: false })
    .limit(1)
    .single()

  const macOnline = macSession
    ? Date.now() - new Date(macSession.last_heartbeat).getTime() < 60_000
    : false

  return NextResponse.json({
    // Google services (OAuth)
    google_calendar: {
      connected: googleValid,
      last_sync: profile?.last_calendar_sync || null,
    },
    google_drive: { connected: googleValid },
    gmail: { connected: googleValid },

    // API key services
    brave_search: {
      connected: !!process.env.BRAVE_API_KEY || !!keyMap.brave_search?.connected,
      source: process.env.BRAVE_API_KEY ? 'env' : keyMap.brave_search?.connected ? 'user_key' : null,
      updated_at: keyMap.brave_search?.updated_at || null,
    },
    e2b: {
      connected: !!process.env.E2B_API_KEY || !!keyMap.e2b?.connected,
      source: process.env.E2B_API_KEY ? 'env' : keyMap.e2b?.connected ? 'user_key' : null,
      updated_at: keyMap.e2b?.updated_at || null,
    },
    anthropic: {
      connected: !!process.env.ANTHROPIC_API_KEY || !!keyMap.anthropic?.connected,
      source: process.env.ANTHROPIC_API_KEY ? 'env' : keyMap.anthropic?.connected ? 'user_key' : null,
      updated_at: keyMap.anthropic?.updated_at || null,
    },

    // Infrastructure
    mac_daemon: {
      connected: macOnline || !!process.env.MAC_DAEMON_SECRET,
      daemon_online: macOnline,
      configured: !!process.env.MAC_DAEMON_SECRET,
      capabilities: macOnline ? macSession?.capabilities : null,
    },

    // WhatsApp (check SQLite DB exists)
    whatsapp: await (async () => {
      try {
        const { checkWhatsAppStatus } = await import('@/lib/tools/whatsapp')
        const status = await checkWhatsAppStatus()
        return { connected: status.online, chatCount: status.chatCount, messageCount: status.messageCount }
      } catch {
        return { connected: false }
      }
    })(),
    // ManyChat (Instagram/Facebook)
    manychat: { connected: !!process.env.MANYCHAT_API_KEY },

    // LinkedIn
    linkedin: { connected: !!process.env.LINKEDIN_ACCESS_TOKEN },

    notion: { connected: false },
  })
}
