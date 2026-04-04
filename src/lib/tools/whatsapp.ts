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
    let rows
    if (query) {
      rows = db.prepare(
        `SELECT c.jid, c.name, c.last_message_time,
          (SELECT content FROM messages WHERE chat_jid = c.jid ORDER BY timestamp DESC LIMIT 1) as last_msg
         FROM chats c WHERE c.name LIKE ? ORDER BY c.last_message_time DESC LIMIT ?`
      ).all(`%${query}%`, limit)
    } else {
      rows = db.prepare(
        `SELECT c.jid, c.name, c.last_message_time,
          (SELECT content FROM messages WHERE chat_jid = c.jid ORDER BY timestamp DESC LIMIT 1) as last_msg
         FROM chats c ORDER BY c.last_message_time DESC LIMIT ?`
      ).all(limit)
    }
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
    const rows = db.prepare(
      `SELECT id, chat_jid, sender, content, timestamp, is_from_me, media_type
       FROM messages WHERE chat_jid = ? ORDER BY timestamp DESC LIMIT ?`
    ).all(chatJid, limit)
    db.close()

    const messages: WAMessage[] = (rows as Array<Record<string, unknown>>).reverse().map(r => ({
      id: r.id as string,
      chatJid: r.chat_jid as string,
      sender: r.sender as string,
      content: r.content as string || (r.media_type ? `[${r.media_type}]` : ''),
      timestamp: r.timestamp as string,
      isFromMe: !!(r.is_from_me),
      mediaType: r.media_type as string | undefined,
    }))

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
  // The bridge exposes a send endpoint when running
  // Try multiple possible endpoints
  let jid = recipient
  if (/^\+?\d+$/.test(recipient.replace(/[\s\-()]/g, ''))) {
    const cleaned = recipient.replace(/[^\d]/g, '')
    jid = `${cleaned}@s.whatsapp.net`
  }

  const endpoints = [
    'http://localhost:8080/send',
    'http://localhost:8080/api/send',
    'http://localhost:8080/api/messages/send',
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: jid, message, chatJID: jid, text: message }),
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) return { success: true }
    } catch {
      continue
    }
  }

  return { success: false, error: 'No se pudo enviar. El bridge de WhatsApp no tiene endpoint de envío activo. Envía manualmente desde WhatsApp Web.' }
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
        (SELECT content FROM messages WHERE chat_jid = c.jid ORDER BY timestamp DESC LIMIT 1) as last_msg
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
