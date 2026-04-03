import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — fetch recent agent logs
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agentId = req.nextUrl.searchParams.get('agent_id')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')

  let query = supabase
    .from('agent_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (agentId) {
    query = query.eq('agent_id', agentId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: data || [] })
}
