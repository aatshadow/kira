import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// POST — Mac daemon sends heartbeat
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-mac-secret')
  if (secret !== process.env.MAC_DAEMON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user_id, mac_id, capabilities, load } = await request.json()
  if (!user_id || !mac_id) {
    return NextResponse.json({ error: 'Missing user_id or mac_id' }, { status: 400 })
  }

  const { error } = await supabase
    .from('kira_mac_sessions')
    .upsert({
      user_id,
      mac_id,
      last_heartbeat: new Date().toISOString(),
      capabilities: capabilities || {},
      load: load || {},
    }, { onConflict: 'user_id,mac_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// GET — Check if Mac is online (called by tools)
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id')
  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  const { data } = await supabase
    .from('kira_mac_sessions')
    .select('last_heartbeat, capabilities, mac_id')
    .eq('user_id', userId)
    .order('last_heartbeat', { ascending: false })
    .limit(1)
    .single()

  if (!data) {
    return NextResponse.json({ online: false })
  }

  const isOnline = Date.now() - new Date(data.last_heartbeat).getTime() < 60_000
  return NextResponse.json({
    online: isOnline,
    mac_id: data.mac_id,
    capabilities: isOnline ? data.capabilities : null,
  })
}
