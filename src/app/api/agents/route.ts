import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      { slug: 'instagram', name: 'Instagram', description: 'Gestiona mensajes directos y notificaciones' },
      { slug: 'linkedin', name: 'LinkedIn', description: 'Gestiona mensajes e invitaciones profesionales' },
      { slug: 'terminal', name: 'Terminal', description: 'Acceso remoto a terminal y ejecución de código' },
    ]

    const rows = defaults.map((d) => ({ ...d, user_id: user.id, status: 'disconnected' }))

    // Check Google Calendar connection
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_access_token, google_refresh_token')
      .eq('id', user.id)
      .single()

    if (profile?.google_access_token || profile?.google_refresh_token) {
      const calRow = rows.find((r) => r.slug === 'google_calendar')
      if (calRow) calRow.status = 'connected'
    }

    const { data: seeded } = await supabase
      .from('agents')
      .insert(rows)
      .select()

    return NextResponse.json({ agents: seeded || [] })
  }

  return NextResponse.json({ agents })
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
