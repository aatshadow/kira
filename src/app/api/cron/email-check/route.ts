import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Get users with Google tokens
  const { data: tokens } = await supabase
    .from('user_google_tokens')
    .select('user_id, access_token, refresh_token, expires_at')

  if (!tokens?.length) {
    return NextResponse.json({ message: 'No Google tokens found' })
  }

  let checked = 0

  for (const token of tokens) {
    try {
      let accessToken = token.access_token

      // Refresh if expired
      if (new Date(token.expires_at) < new Date()) {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: token.refresh_token,
            grant_type: 'refresh_token',
          }),
        })
        if (!refreshRes.ok) continue
        const refreshData = await refreshRes.json()
        accessToken = refreshData.access_token

        await supabase.from('user_google_tokens').update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        }).eq('user_id', token.user_id)
      }

      // Check recent unread emails (last 15 min)
      const res = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages?` +
        `maxResults=5&q=is:unread newer_than:15m`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (!res.ok) continue
      const data = await res.json()
      const messageIds = (data.messages || []).map((m: { id: string }) => m.id)

      if (messageIds.length === 0) { checked++; continue }

      // Fetch message details
      const urgentEmails: Array<{ subject: string; from: string; snippet: string }> = []

      for (const msgId of messageIds.slice(0, 3)) {
        const msgRes = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (!msgRes.ok) continue
        const msg = await msgRes.json()

        const headers = msg.payload?.headers || []
        const subject = headers.find((h: { name: string }) => h.name === 'Subject')?.value || '(sin asunto)'
        const from = headers.find((h: { name: string }) => h.name === 'From')?.value || ''

        urgentEmails.push({ subject, from, snippet: msg.snippet || '' })
      }

      if (urgentEmails.length > 0) {
        // Create notification for new emails
        await supabase.from('kira_notifications').insert({
          user_id: token.user_id,
          type: 'email_urgent',
          title: `${urgentEmails.length} email${urgentEmails.length > 1 ? 's' : ''} nuevo${urgentEmails.length > 1 ? 's' : ''}`,
          body: urgentEmails.map(e => `${e.from}: ${e.subject}`).join('\n'),
          data: { emails: urgentEmails },
        })
      }

      checked++
    } catch (err) {
      console.error(`[CRON] Email check failed for user ${token.user_id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, checked })
}
