import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Get all users (for personal use, there's likely just one)
  const { data: users } = await supabase.auth.admin.listUsers()
  if (!users?.users?.length) {
    return NextResponse.json({ message: 'No users' })
  }

  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  for (const user of users.users) {
    try {
      // Fetch yesterday's data
      const [tasksRes, meetingsRes, memoriesRes, messagesRes] = await Promise.all([
        supabase.from('tasks').select('title, status, priority, due_date')
          .eq('user_id', user.id)
          .gte('updated_at', yesterday.toISOString())
          .limit(50),
        supabase.from('meetings').select('title, status, scheduled_at, duration_mins')
          .eq('user_id', user.id)
          .gte('scheduled_at', yesterday.toISOString())
          .lte('scheduled_at', now.toISOString())
          .limit(20),
        supabase.from('kira_memory').select('category, content')
          .eq('user_id', user.id)
          .gte('created_at', yesterday.toISOString())
          .limit(20),
        supabase.from('chat_messages').select('role, content')
          .eq('user_id', user.id)
          .eq('role', 'user')
          .gte('created_at', yesterday.toISOString())
          .limit(30),
      ])

      const tasks = tasksRes.data || []
      const meetings = meetingsRes.data || []
      const newMemories = memoriesRes.data || []
      const userMessages = messagesRes.data || []

      // Skip if no activity
      if (tasks.length === 0 && meetings.length === 0 && userMessages.length === 0) continue

      const completedTasks = tasks.filter(t => t.status === 'done')
      const pendingTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress')

      const prompt = `Generate a brief daily digest in Spanish for the user. Be warm and encouraging.

Yesterday's activity:
- Tasks completed: ${completedTasks.length} (${completedTasks.map(t => t.title).join(', ') || 'none'})
- Tasks pending/updated: ${pendingTasks.length} (${pendingTasks.map(t => t.title).join(', ') || 'none'})
- Meetings: ${meetings.length} (${meetings.map(m => m.title).join(', ') || 'none'})
- New memories saved: ${newMemories.length}
- Chat interactions: ${userMessages.length}

Format as JSON: { "summary": "2-3 sentence overview", "highlights": ["key achievements"], "upcoming": ["tasks/events to focus on today"], "tip": "one personalized productivity tip" }`

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      let digestContent
      try {
        digestContent = JSON.parse(text.replace(/```json\n?|\n?```/g, ''))
      } catch {
        digestContent = { summary: text, highlights: [], upcoming: [], tip: '' }
      }

      // Save digest
      await supabase.from('kira_digests').insert({
        user_id: user.id,
        type: 'daily',
        content: digestContent,
        period_start: yesterday.toISOString(),
        period_end: now.toISOString(),
      })

      // Create notification
      await supabase.from('kira_notifications').insert({
        user_id: user.id,
        type: 'digest',
        title: 'Tu resumen diario está listo',
        body: digestContent.summary,
        data: { digest_type: 'daily' },
      })
    } catch (err) {
      console.error(`[CRON] Daily digest failed for user ${user.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true })
}
