import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readWhatsAppMessages } from '@/lib/tools/whatsapp'

// GET — fetch messages for a thread
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const threadId = req.nextUrl.searchParams.get('thread_id')
  if (!threadId) return NextResponse.json({ error: 'thread_id required' }, { status: 400 })

  // Get thread info to check channel
  const { data: thread } = await supabase
    .from('inbox_threads')
    .select('channel, contact_id')
    .eq('id', threadId)
    .eq('user_id', user.id)
    .single()

  // For WhatsApp: read directly from SQLite DB
  if (thread?.channel === 'whatsapp' && thread.contact_id) {
    const { messages: waMessages } = await readWhatsAppMessages(thread.contact_id, 50)
    const formatted = waMessages.map(m => ({
      id: m.id,
      user_id: user.id,
      channel: 'whatsapp',
      thread_id: threadId,
      contact_name: m.sender,
      contact_id: m.chatJid,
      direction: m.isFromMe ? 'outbound' : 'inbound',
      content: m.content,
      content_type: m.mediaType || 'text',
      is_read: true,
      created_at: m.timestamp,
      external_id: m.id,
      external_timestamp: m.timestamp,
    }))

    // Reset unread
    await supabase
      .from('inbox_threads')
      .update({ unread_count: 0 })
      .eq('id', threadId)
      .eq('user_id', user.id)

    return NextResponse.json({ messages: formatted })
  }

  // For Gmail: read from Gmail API if no cached messages
  if (thread?.channel === 'gmail' && thread.contact_id) {
    // First check Supabase cache
    const { data: cached } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (cached && cached.length > 0) {
      return NextResponse.json({ messages: cached })
    }

    // Fetch from Gmail API
    try {
      const { getValidGoogleToken } = await import('@/lib/google')
      const token = await getValidGoogleToken(supabase, user.id)
      if (token) {
        const query = encodeURIComponent(`from:${thread.contact_id} OR to:${thread.contact_id}`)
        const res = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=15`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          const data = await res.json()
          const msgIds = (data.messages || []) as Array<{ id: string }>

          const messages = await Promise.all(
            msgIds.slice(0, 15).map(async (msg) => {
              const detail = await fetch(
                `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
                { headers: { Authorization: `Bearer ${token}` } }
              )
              if (!detail.ok) return null
              const m = await detail.json()
              const headers = (m.payload?.headers || []) as Array<{ name: string; value: string }>
              const getH = (n: string) => headers.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || ''
              const from = getH('From')
              const isFromMe = from.includes(user.email || '')

              return {
                id: msg.id,
                user_id: user.id,
                channel: 'gmail',
                thread_id: threadId,
                contact_name: from,
                contact_id: thread.contact_id,
                direction: isFromMe ? 'outbound' : 'inbound',
                content: `**${getH('Subject')}**\n${m.snippet || ''}`,
                content_type: 'email',
                is_read: !(m.labelIds || []).includes('UNREAD'),
                created_at: getH('Date') ? new Date(getH('Date')).toISOString() : new Date().toISOString(),
                external_id: msg.id,
              }
            })
          )

          return NextResponse.json({ messages: messages.filter(Boolean) })
        }
      }
    } catch { /* fall through to Supabase */ }
  }

  // Default: read from Supabase
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

  // Route to actual channel API
  let sendResult: { success: boolean; error?: string } = { success: true }

  try {
    switch (channel) {
      case 'whatsapp': {
        const res = await fetch('http://localhost:8080/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: contact_id, message: content }),
        })
        if (!res.ok) sendResult = { success: false, error: `WhatsApp error ${res.status}` }
        break
      }
      case 'gmail': {
        // Gmail sending requires OAuth token — delegate to the gmail tool
        const { getValidGoogleToken } = await import('@/lib/google')
        const token = await getValidGoogleToken(supabase, user.id)
        if (!token) {
          sendResult = { success: false, error: 'No Google token' }
        } else {
          const rawMessage = `To: ${contact_id}\r\nSubject: Re: conversation\r\nContent-Type: text/plain; charset=utf-8\r\nMIME-Version: 1.0\r\n\r\n${content}`
          const encoded = Buffer.from(rawMessage).toString('base64url')
          const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw: encoded }),
          })
          if (!res.ok) sendResult = { success: false, error: `Gmail error ${res.status}` }
        }
        break
      }
      case 'instagram': {
        // Send via ManyChat
        const mcKey = process.env.MANYCHAT_API_KEY
        if (!mcKey) {
          sendResult = { success: false, error: 'ManyChat not configured' }
        } else {
          const res = await fetch('https://api.manychat.com/fb/sending/sendContent', {
            method: 'POST',
            headers: { Authorization: `Bearer ${mcKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscriber_id: contact_id,
              data: { version: 'v2', content: { messages: [{ type: 'text', text: content }] } },
              message_tag: 'ACCOUNT_UPDATE',
            }),
          })
          if (!res.ok) sendResult = { success: false, error: `ManyChat error ${res.status}` }
        }
        break
      }
      case 'linkedin': {
        sendResult = { success: false, error: 'LinkedIn messaging requires special API permissions' }
        break
      }
    }
  } catch (err) {
    sendResult = { success: false, error: err instanceof Error ? err.message : 'Send failed' }
  }

  return NextResponse.json({ message, sendResult })
}
