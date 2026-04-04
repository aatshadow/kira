import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidGoogleToken } from '@/lib/google'
import { getRecentChatsForSync } from '@/lib/tools/whatsapp'

/**
 * POST /api/inbox/sync
 * Syncs messages from all connected channels into inbox_threads & inbox_messages
 * Channels: Gmail, WhatsApp (bridge), ManyChat, LinkedIn
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { channels } = await req.json().catch(() => ({ channels: null }))
  const targetChannels: string[] = channels || ['gmail', 'whatsapp', 'instagram', 'linkedin']

  const results: Record<string, { synced: number; error?: string }> = {}

  // --- Gmail sync ---
  if (targetChannels.includes('gmail')) {
    try {
      const token = await getValidGoogleToken(supabase, user.id)
      if (!token) {
        results.gmail = { synced: 0, error: 'No Google token' }
      } else {
        const res = await fetch(
          'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=in:inbox',
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) {
          results.gmail = { synced: 0, error: `API error ${res.status}` }
        } else {
          const data = await res.json()
          const messageIds = (data.messages || []) as Array<{ id: string }>
          let synced = 0

          for (const msg of messageIds.slice(0, 100)) {
            const detail = await fetch(
              `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            if (!detail.ok) continue
            const m = await detail.json()

            const headers = (m.payload?.headers || []) as Array<{ name: string; value: string }>
            const getH = (n: string) => headers.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || ''
            const from = getH('From')
            const subject = getH('Subject') || '(sin asunto)'
            const date = getH('Date')
            const labels = (m.labelIds || []) as string[]
            const unread = labels.includes('UNREAD')

            // Extract email address from "Name <email>" format
            const emailMatch = from.match(/<([^>]+)>/)
            const contactId = emailMatch ? emailMatch[1] : from
            const contactName = from.replace(/<[^>]+>/, '').trim() || contactId

            // Upsert thread
            const { data: thread } = await supabase
              .from('inbox_threads')
              .upsert({
                user_id: user.id,
                channel: 'gmail',
                contact_id: contactId,
                contact_name: contactName,
                last_message: `${subject}: ${(m.snippet || '').slice(0, 100)}`,
                last_message_at: date ? new Date(date).toISOString() : new Date().toISOString(),
                unread_count: unread ? 1 : 0,
                pipeline_stage: 'new',
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id,channel,contact_id' })
              .select('id')
              .single()

            if (thread) {
              // Upsert message
              await supabase
                .from('inbox_messages')
                .upsert({
                  user_id: user.id,
                  channel: 'gmail',
                  thread_id: thread.id,
                  contact_id: contactId,
                  contact_name: contactName,
                  direction: 'inbound',
                  content: `**${subject}**\n${m.snippet || ''}`,
                  content_type: 'email',
                  is_read: !unread,
                  external_id: msg.id,
                  external_timestamp: date ? new Date(date).toISOString() : null,
                }, { onConflict: 'user_id,external_id' })

              synced++
            }
          }
          results.gmail = { synced }
        }
      }
    } catch (err) {
      results.gmail = { synced: 0, error: err instanceof Error ? err.message : 'Error' }
    }
  }

  // --- WhatsApp sync (reads from SQLite) ---
  if (targetChannels.includes('whatsapp')) {
    try {
      const chats = getRecentChatsForSync(30)
      if (chats.length === 0) {
        results.whatsapp = { synced: 0, error: 'No WhatsApp data found in SQLite DB' }
      } else {
        let synced = 0
        for (const chat of chats) {
          const { data: thread } = await supabase
            .from('inbox_threads')
            .upsert({
              user_id: user.id,
              channel: 'whatsapp',
              contact_id: chat.jid,
              contact_name: chat.name || chat.jid,
              last_message: chat.lastMessage.slice(0, 200),
              last_message_at: chat.lastTime ? new Date(chat.lastTime).toISOString() : new Date().toISOString(),
              pipeline_stage: 'new',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,channel,contact_id' })
            .select('id')
            .single()

          if (thread) synced++
        }
        results.whatsapp = { synced }
      }
    } catch (err) {
      results.whatsapp = { synced: 0, error: err instanceof Error ? err.message : 'WhatsApp sync error' }
    }
  }

  // --- ManyChat (Instagram) sync ---
  if (targetChannels.includes('instagram')) {
    const mcKey = process.env.MANYCHAT_API_KEY
    if (!mcKey) {
      results.instagram = { synced: 0, error: 'MANYCHAT_API_KEY not set' }
    } else {
      try {
        // ManyChat doesn't have a "list recent conversations" endpoint easily
        // We sync the page info to verify connection
        const res = await fetch('https://api.manychat.com/fb/page/getInfo', {
          headers: { Authorization: `Bearer ${mcKey}`, Accept: 'application/json' },
        })
        if (res.ok) {
          results.instagram = { synced: 0, error: undefined }
        } else {
          results.instagram = { synced: 0, error: `ManyChat error ${res.status}` }
        }
      } catch (err) {
        results.instagram = { synced: 0, error: err instanceof Error ? err.message : 'Error' }
      }
    }
  }

  // --- LinkedIn sync ---
  if (targetChannels.includes('linkedin')) {
    const liToken = process.env.LINKEDIN_ACCESS_TOKEN
    if (!liToken) {
      results.linkedin = { synced: 0, error: 'LINKEDIN_ACCESS_TOKEN not set' }
    } else {
      try {
        const res = await fetch('https://api.linkedin.com/v2/me', {
          headers: { Authorization: `Bearer ${liToken}` },
        })
        if (res.ok) {
          results.linkedin = { synced: 0 }
        } else {
          results.linkedin = { synced: 0, error: `LinkedIn error ${res.status}` }
        }
      } catch (err) {
        results.linkedin = { synced: 0, error: err instanceof Error ? err.message : 'Error' }
      }
    }
  }

  return NextResponse.json({ results })
}
