import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — fetch messages for a thread
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const threadId = req.nextUrl.searchParams.get('thread_id')
  if (!threadId) return NextResponse.json({ error: 'thread_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('inbox_messages')
    .select('*')
    .eq('user_id', user.id)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark as read
  await supabase
    .from('inbox_messages')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('thread_id', threadId)
    .eq('is_read', false)

  // Reset unread count on thread
  await supabase
    .from('inbox_threads')
    .update({ unread_count: 0 })
    .eq('id', threadId)
    .eq('user_id', user.id)

  return NextResponse.json({ messages: data || [] })
}

// POST — send a message (outbound)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { thread_id, channel, contact_id, content } = await req.json()

  // Insert the outbound message
  const { data: message, error } = await supabase
    .from('inbox_messages')
    .insert({
      user_id: user.id,
      channel,
      thread_id,
      contact_id,
      direction: 'outbound',
      content,
      content_type: 'text',
      is_read: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update thread
  if (thread_id) {
    await supabase
      .from('inbox_threads')
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        pipeline_stage: 'replied',
        updated_at: new Date().toISOString(),
      })
      .eq('id', thread_id)
  }

  // TODO: Route to actual channel API (WhatsApp MCP, Gmail API, etc.)
  // This would call the agent execute endpoint for the specific channel

  return NextResponse.json({ message })
}
