import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncAgentStatuses(supabase: SupabaseClient, userId: string, agents: any[]) {
  // Check real connection state for each integration
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token')
    .eq('id', userId)
    .single()

  const googleConnected = !!(profile?.google_access_token || profile?.google_refresh_token)
  const manychatConnected = !!process.env.MANYCHAT_API_KEY
  const linkedinConnected = !!process.env.LINKEDIN_ACCESS_TOKEN
  const terminalConnected = !!process.env.MAC_DAEMON_SECRET

  let whatsappConnected = false
  try {
    const { checkWhatsAppStatus } = await import('@/lib/tools/whatsapp')
    const ws = await checkWhatsAppStatus()
    whatsappConnected = ws.online
  } catch { /* */ }

  const statusMap: Record<string, boolean> = {
    google_calendar: googleConnected,
    gmail: googleConnected,
    whatsapp: whatsappConnected,
    instagram: manychatConnected,
    linkedin: linkedinConnected,
    terminal: terminalConnected,
    notion: false,
  }

  // Also fix old "Instagram" names in DB
  const nameFixMap: Record<string, string> = {
    instagram: 'ManyChat (Instagram)',
  }

  const updates: PromiseLike<unknown>[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = agents.map((agent: any) => {
    const shouldBeConnected = statusMap[agent.slug]
    const correctName = nameFixMap[agent.slug]
    const needsUpdate =
      (shouldBeConnected !== undefined && (shouldBeConnected ? 'connected' : 'disconnected') !== agent.status) ||
      (correctName && agent.name !== correctName)

    if (needsUpdate) {
      const newStatus = shouldBeConnected ? 'connected' : 'disconnected'
      const updateData: Record<string, unknown> = { status: newStatus }
      if (correctName) updateData.name = correctName
      updates.push(
        supabase.from('agents').update(updateData).eq('id', agent.id).eq('user_id', userId)
      )
      return { ...agent, status: newStatus, ...(correctName ? { name: correctName } : {}) }
    }
    return agent
  })

  // Fire updates in parallel (non-blocking)
  if (updates.length > 0) Promise.all(updates).catch(() => {})

  return result
}

// GET — fetch all agents for user (auto-seed defaults if none exist)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  // Auto-seed default agent configs if user has none
  if (!agents || agents.length === 0) {
    const defaults = [
      { slug: 'google_calendar', name: 'Google Calendar', description: 'Sincroniza y gestiona eventos del calendario' },
      { slug: 'gmail', name: 'Gmail', description: 'Lee, envía y gestiona correos electrónicos' },
      { slug: 'whatsapp', name: 'WhatsApp', description: 'Envía mensajes y consulta conversaciones' },
      { slug: 'notion', name: 'Notion', description: 'Gestiona documentos, bases de datos y wikis' },
      { slug: 'instagram', name: 'ManyChat (Instagram)', description: 'Envía y recibe DMs de Instagram vía ManyChat' },
      { slug: 'linkedin', name: 'LinkedIn', description: 'Publica posts y consulta perfil profesional' },
      { slug: 'terminal', name: 'Terminal', description: 'Acceso remoto a terminal y ejecución de código' },
    ]

    const rows = defaults.map((d) => ({ ...d, user_id: user.id, status: 'disconnected' }))

    // Auto-detect connected integrations
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_access_token, google_refresh_token')
      .eq('id', user.id)
      .single()

    if (profile?.google_access_token || profile?.google_refresh_token) {
      for (const r of rows) {
        if (['google_calendar', 'gmail'].includes(r.slug)) r.status = 'connected'
      }
    }

    // Check env-based connections
    if (process.env.MANYCHAT_API_KEY) {
      const r = rows.find((r) => r.slug === 'instagram')
      if (r) r.status = 'connected'
    }
    if (process.env.LINKEDIN_ACCESS_TOKEN) {
      const r = rows.find((r) => r.slug === 'linkedin')
      if (r) r.status = 'connected'
    }
    if (process.env.MAC_DAEMON_SECRET) {
      const r = rows.find((r) => r.slug === 'terminal')
      if (r) r.status = 'connected'
    }

    const { data: seeded } = await supabase
      .from('agents')
      .insert(rows)
      .select()

    return NextResponse.json({ agents: seeded || [] })
  }

  // Sync status with real connection state on every fetch
  const agentsWithLiveStatus = await syncAgentStatuses(supabase, user.id, agents)
  return NextResponse.json({ agents: agentsWithLiveStatus })
}

// PATCH — update agent config/status/permissions
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'Agent id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('agents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agent: data })
}
