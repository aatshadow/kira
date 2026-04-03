import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — fetch inbox threads with optional filters
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const channel = req.nextUrl.searchParams.get('channel')
  const pipeline = req.nextUrl.searchParams.get('pipeline')

  let query = supabase
    .from('inbox_threads')
    .select('*')
    .eq('user_id', user.id)
    .order('is_pinned', { ascending: false })
    .order('last_message_at', { ascending: false })
    .limit(100)

  if (channel) query = query.eq('channel', channel)
  if (pipeline) query = query.eq('pipeline_stage', pipeline)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ threads: data || [] })
}

// PATCH — update thread (pipeline stage, pin, tags)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'Thread id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('inbox_threads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ thread: data })
}
