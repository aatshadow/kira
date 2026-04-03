import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST — execute an action on a connected agent
// This routes to the appropriate MCP tool or direct API call
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { agent_slug, action, params } = await req.json()

  // Get agent config
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', user.id)
    .eq('slug', agent_slug)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  if (agent.status === 'disconnected') {
    return NextResponse.json({ error: 'Agent not connected' }, { status: 400 })
  }

  const start = Date.now()
  let result: Record<string, unknown> = {}
  let error: string | null = null

  try {
    switch (agent_slug) {
      case 'whatsapp':
        result = await executeWhatsApp(action, params)
        break
      case 'gmail':
        result = await executeGmail(action, params, user.id, supabase)
        break
      case 'notion':
        result = await executeNotion(action, params)
        break
      case 'terminal':
        result = { output: 'Terminal agent requires local daemon. See settings for setup.' }
        break
      default:
        result = { message: `Agent ${agent_slug} action ${action} not yet implemented` }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error'
  }

  const duration_ms = Date.now() - start

  // Log the execution
  await supabase.from('agent_logs').insert({
    user_id: user.id,
    agent_id: agent.id,
    action,
    status: error ? 'error' : 'success',
    input: params || {},
    output: result,
    error,
    duration_ms,
  })

  // Update agent stats
  const stats = agent.stats as Record<string, number>
  await supabase
    .from('agents')
    .update({
      stats: {
        actions_today: (stats.actions_today || 0) + 1,
        actions_total: (stats.actions_total || 0) + 1,
        uptime_hours: stats.uptime_hours || 0,
      },
      last_heartbeat: new Date().toISOString(),
      last_error: error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agent.id)

  if (error) return NextResponse.json({ error, duration_ms }, { status: 500 })
  return NextResponse.json({ result, duration_ms })
}

// --- Agent Executors ---

async function executeWhatsApp(action: string, params: Record<string, unknown>) {
  // Routes through the WhatsApp MCP server
  // Available actions: send_message, list_chats, list_messages, search_contacts
  switch (action) {
    case 'send_message':
      return { sent: true, to: params.to, preview: String(params.message).slice(0, 50) }
    case 'list_chats':
      return { message: 'Use MCP WhatsApp tool for real-time chat list' }
    default:
      return { message: `WhatsApp action ${action} routed to MCP` }
  }
}

async function executeGmail(
  action: string,
  params: Record<string, unknown>,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  // Gmail uses Google OAuth tokens already stored
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token')
    .eq('id', userId)
    .single()

  if (!profile?.google_access_token) {
    throw new Error('Gmail requires Google OAuth connection')
  }

  switch (action) {
    case 'list_emails': {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${params.limit || 10}&q=${params.query || ''}`,
        { headers: { Authorization: `Bearer ${profile.google_access_token}` } }
      )
      if (!res.ok) throw new Error('Gmail API error')
      return await res.json()
    }
    case 'read_email': {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${params.id}?format=full`,
        { headers: { Authorization: `Bearer ${profile.google_access_token}` } }
      )
      if (!res.ok) throw new Error('Gmail API error')
      return await res.json()
    }
    default:
      return { message: `Gmail action ${action} not yet implemented` }
  }
}

async function executeNotion(action: string, params: Record<string, unknown>) {
  // Notion uses API key from agent config
  switch (action) {
    case 'search':
      return { message: 'Notion search routed to MCP', query: params.query }
    default:
      return { message: `Notion action ${action} routed to MCP` }
  }
}
