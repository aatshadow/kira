/**
 * WhatsApp integration for KIRA
 * Reads directly from the WhatsApp bridge SQLite database
 * and sends messages via the bridge's HTTP endpoint (if available)
 */

import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.env.HOME || '/Users/alex', 'whatsapp-mcp/whatsapp-bridge/store/messages.db')

function getDb(): Database.Database {
  return new Database(DB_PATH, { readonly: true })
}

interface WAChat {
  jid: string
  name: string | null
  lastMessageTime: string | null
  lastMessage?: string
}

interface WAMessage {
  id: string
  chatJid: string
  sender: string
  senderName: string
  content: string
  timestamp: string
  isFromMe: boolean
  mediaType?: string
}

export async function listWhatsAppChats(
  query?: string,
  limit: number = 20
): Promise<{ chats: WAChat[]; error?: string }> {
  try {
    const db = getDb()
    // Use a correlated subquery only for last message (unavoidable),
    // but limit the chat scan first for speed
    const sql = query
      ? `SELECT c.jid, c.name, c.last_message_time,
          (SELECT content FROM messages m WHERE m.chat_jid = c.jid ORDER BY m.timestamp DESC LIMIT 1) as last_msg
         FROM chats c WHERE c.name LIKE ? ORDER BY c.last_message_time DESC LIMIT ?`
      : `SELECT c.jid, c.name, c.last_message_time,
          (SELECT content FROM messages m WHERE m.chat_jid = c.jid ORDER BY m.timestamp DESC LIMIT 1) as last_msg
         FROM chats c ORDER BY c.last_message_time DESC LIMIT ?`

    const rows = query
      ? db.prepare(sql).all(`%${query}%`, limit)
      : db.prepare(sql).all(limit)
    db.close()

    const chats: WAChat[] = (rows as Array<Record<string, unknown>>).map(r => ({
      jid: r.jid as string,
      name: r.name as string | null,
      lastMessageTime: r.last_message_time as string | null,
      lastMessage: r.last_msg as string | undefined,
    }))

    return { chats }
  } catch (err) {
    return { chats: [], error: err instanceof Error ? err.message : 'Error leyendo WhatsApp DB' }
  }
}

export async function readWhatsAppMessages(
  chatJid: string,
  limit: number = 20
): Promise<{ messages: WAMessage[]; error?: string }> {
  try {
    const db = getDb()

    // Get chat name for the conversation
    const chatRow = db.prepare('SELECT name FROM chats WHERE jid = ?').get(chatJid) as Record<string, unknown> | undefined
    const chatName = (chatRow?.name as string) || null

    // Get messages with sender name resolved from chats table
    const rows = db.prepare(
      `SELECT m.id, m.chat_jid, m.sender, m.content, m.timestamp, m.is_from_me, m.media_type,
        (SELECT c.name FROM chats c WHERE c.jid = m.sender LIMIT 1) as sender_name
       FROM messages m WHERE m.chat_jid = ? ORDER BY m.timestamp DESC LIMIT ?`
    ).all(chatJid, limit)
    db.close()

    const messages: WAMessage[] = (rows as Array<Record<string, unknown>>).reverse().map(r => {
      const isFromMe = !!(r.is_from_me)
      const rawSender = r.sender as string || ''
      const resolvedName = r.sender_name as string | null

      // Build a readable sender name
      let senderName = 'Desconocido'
      if (isFromMe) {
        senderName = 'Tú'
      } else if (resolvedName) {
        senderName = resolvedName
      } else if (chatName && !chatJid.includes('@g.us')) {
        // 1-on-1 chat: if no sender_name, use the chat name
        senderName = chatName
      } else if (rawSender) {
        // Group chat with unknown sender: show phone number
        const phone = rawSender.replace(/@.*/, '')
        senderName = `+${phone}`
      }

      return {
        id: r.id as string,
        chatJid: r.chat_jid as string,
        sender: rawSender,
        senderName,
        content: r.content as string || (r.media_type ? `[${r.media_type}]` : ''),
        timestamp: r.timestamp as string,
        isFromMe,
        mediaType: r.media_type as string | undefined,
      }
    })

    return { messages }
  } catch (err) {
    return { messages: [], error: err instanceof Error ? err.message : 'Error' }
  }
}

export async function searchWhatsAppContacts(
  query: string
): Promise<{ contacts: Array<{ jid: string; name: string | null }>; error?: string }> {
  try {
    const db = getDb()
    const rows = db.prepare(
      `SELECT jid, name FROM chats WHERE name LIKE ? OR jid LIKE ? ORDER BY last_message_time DESC LIMIT 20`
    ).all(`%${query}%`, `%${query}%`)
    db.close()

    return {
      contacts: (rows as Array<Record<string, unknown>>).map(r => ({
        jid: r.jid as string,
        name: r.name as string | null,
      })),
    }
  } catch (err) {
    return { contacts: [], error: err instanceof Error ? err.message : 'Error' }
  }
}

export async function sendWhatsApp(
  recipient: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  let jid = recipient
  if (/^\+?\d+$/.test(recipient.replace(/[\s\-()]/g, ''))) {
    const cleaned = recipient.replace(/[^\d]/g, '')
    jid = `${cleaned}@s.whatsapp.net`
  }

  // Use the known working endpoint
  try {
    const res = await fetch('http://localhost:8080/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: jid, message }),
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) return { success: true }
    const err = await res.text()
    return { success: false, error: `Bridge error ${res.status}: ${err.slice(0, 200)}` }
  } catch {
    return { success: false, error: 'No se pudo conectar al bridge de WhatsApp (localhost:8080). ¿Está corriendo?' }
  }
}

export async function checkWhatsAppStatus(): Promise<{ online: boolean; chatCount?: number; messageCount?: number; error?: string }> {
  try {
    const db = getDb()
    const chatCount = (db.prepare('SELECT COUNT(*) as c FROM chats').get() as Record<string, number>).c
    const msgCount = (db.prepare('SELECT COUNT(*) as c FROM messages').get() as Record<string, number>).c
    db.close()
    return { online: true, chatCount, messageCount: msgCount }
  } catch {
    return { online: false, error: 'WhatsApp DB no disponible' }
  }
}

/**
 * Get recent chats for inbox sync (returns raw data for batch insert)
 */
export function getRecentChatsForSync(limit: number = 30): Array<{ jid: string; name: string | null; lastMessage: string; lastTime: string }> {
  try {
    const db = getDb()
    const rows = db.prepare(
      `SELECT c.jid, c.name, c.last_message_time,
        (SELECT content FROM messages m WHERE m.chat_jid = c.jid ORDER BY m.timestamp DESC LIMIT 1) as last_msg
       FROM chats c WHERE c.last_message_time IS NOT NULL
       ORDER BY c.last_message_time DESC LIMIT ?`
    ).all(limit)
    db.close()

    return (rows as Array<Record<string, unknown>>).map(r => ({
      jid: r.jid as string,
      name: r.name as string | null,
      lastMessage: (r.last_msg as string) || '',
      lastTime: r.last_message_time as string,
    }))
  } catch {
    return []
  }
}
