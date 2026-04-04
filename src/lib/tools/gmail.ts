import { createClient } from '@/lib/supabase/server'
import { getValidGoogleToken } from '@/lib/google'

export interface EmailSummary {
  id: string
  threadId: string
  from: string
  subject: string
  snippet: string
  date: string
  unread: boolean
  labels: string[]
}

export async function readEmails(
  userId: string,
  options: { query?: string; maxResults?: number; unreadOnly?: boolean } = {}
): Promise<{ emails: EmailSummary[]; error?: string }> {
  const supabase = await createClient()
  const token = await getValidGoogleToken(supabase, userId)
  if (!token) {
    return { emails: [], error: 'Gmail no conectado. Inicia sesión con Google desde Settings → Integraciones.' }
  }

  try {
    const { query, maxResults = 10, unreadOnly = false } = options
    let q = query || ''
    if (unreadOnly) q = q ? `${q} is:unread` : 'is:unread'

    const params = new URLSearchParams({
      maxResults: String(Math.min(maxResults, 20)),
    })
    if (q) params.set('q', q)

    const listRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!listRes.ok) {
      const err = await listRes.text()
      return { emails: [], error: `Gmail API error ${listRes.status}: ${err.slice(0, 200)}` }
    }

    const listData = await listRes.json()
    const messageIds: Array<{ id: string }> = listData.messages || []

    if (messageIds.length === 0) {
      return { emails: [] }
    }

    // Fetch message details in parallel (max 10)
    const details = await Promise.all(
      messageIds.slice(0, 10).map(async (msg) => {
        const res = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) return null
        return res.json()
      })
    )

    const emails: EmailSummary[] = details
      .filter(Boolean)
      .map((msg: Record<string, unknown>) => {
        const headers = ((msg.payload as Record<string, unknown>)?.headers as Array<{ name: string; value: string }>) || []
        const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''
        const labels = (msg.labelIds as string[]) || []

        return {
          id: msg.id as string,
          threadId: msg.threadId as string,
          from: getHeader('From'),
          subject: getHeader('Subject') || '(sin asunto)',
          snippet: (msg.snippet as string) || '',
          date: getHeader('Date'),
          unread: labels.includes('UNREAD'),
          labels,
        }
      })

    return { emails }
  } catch (err) {
    return { emails: [], error: err instanceof Error ? err.message : 'Error al leer emails' }
  }
}

export async function sendEmail(
  userId: string,
  options: { to: string; subject: string; body: string; cc?: string; bcc?: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const supabase = await createClient()
  const token = await getValidGoogleToken(supabase, userId)
  if (!token) {
    return { success: false, error: 'Gmail no conectado. Inicia sesión con Google desde Settings → Integraciones.' }
  }

  try {
    const { to, subject, body, cc, bcc } = options

    // Build RFC 2822 email
    const lines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
    ]
    if (cc) lines.push(`Cc: ${cc}`)
    if (bcc) lines.push(`Bcc: ${bcc}`)
    lines.push('', body)

    const rawMessage = lines.join('\r\n')
    const encoded = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const res = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encoded }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: `Error al enviar: ${err.slice(0, 200)}` }
    }

    const data = await res.json()
    return { success: true, messageId: data.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error al enviar email' }
  }
}

export async function getEmailContent(
  userId: string,
  messageId: string
): Promise<{ content: string; error?: string }> {
  const supabase = await createClient()
  const token = await getValidGoogleToken(supabase, userId)
  if (!token) {
    return { content: '', error: 'Gmail no conectado' }
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) {
      return { content: '', error: `Error ${res.status}` }
    }

    const msg = await res.json()

    // Extract body from parts
    function extractBody(payload: Record<string, unknown>): string {
      if (payload.body && (payload.body as Record<string, unknown>).data) {
        const data = (payload.body as Record<string, string>).data
        return Buffer.from(data, 'base64url').toString('utf-8')
      }
      if (payload.parts) {
        for (const part of payload.parts as Array<Record<string, unknown>>) {
          const mimeType = part.mimeType as string
          if (mimeType === 'text/plain' || mimeType === 'text/html') {
            const body = part.body as Record<string, string>
            if (body?.data) {
              let text = Buffer.from(body.data, 'base64url').toString('utf-8')
              if (mimeType === 'text/html') {
                // Strip HTML tags for readability
                text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
              }
              return text
            }
          }
          // Recurse into multipart
          const nested = extractBody(part)
          if (nested) return nested
        }
      }
      return ''
    }

    const body = extractBody(msg.payload || {})
    return { content: body.slice(0, 3000) || msg.snippet || '(sin contenido)' }
  } catch (err) {
    return { content: '', error: err instanceof Error ? err.message : 'Error' }
  }
}
