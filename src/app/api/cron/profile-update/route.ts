import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: users } = await supabase.auth.admin.listUsers()
  if (!users?.users?.length) {
    return NextResponse.json({ message: 'No users' })
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  for (const user of users.users) {
    try {
      // Fetch 30 days of data
      const [tasksRes, sessionsRes, meetingsRes, memoriesRes, messagesRes] = await Promise.all([
        supabase.from('tasks').select('title, status, priority, created_at, updated_at, estimated_mins, actual_mins')
          .eq('user_id', user.id).gte('created_at', thirtyDaysAgo),
        supabase.from('timer_sessions').select('duration_secs, created_at')
          .eq('user_id', user.id).gte('created_at', thirtyDaysAgo),
        supabase.from('meetings').select('title, status, scheduled_at, duration_mins')
          .eq('user_id', user.id).gte('scheduled_at', thirtyDaysAgo),
        supabase.from('kira_memory').select('category, content')
          .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(50),
        supabase.from('chat_messages').select('content, created_at')
          .eq('user_id', user.id).eq('role', 'user')
          .order('created_at', { ascending: false }).limit(50),
      ])

      const tasks = tasksRes.data || []
      const sessions = sessionsRes.data || []
      const meetings = meetingsRes.data || []
      const memories = memoriesRes.data || []
      const messages = messagesRes.data || []

      // Calculate metrics
      const completedTasks = tasks.filter(t => t.status === 'done')
      const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length * 100).toFixed(1) : '0'

      const totalFocusMins = sessions.reduce((sum, s) => sum + Math.round((s.duration_secs || 0) / 60), 0)

      // Session hour distribution
      const hourCounts: Record<number, number> = {}
      for (const s of sessions) {
        const hour = new Date(s.created_at).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      }
      const peakHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h]) => `${h}:00`)

      const prompt = `Analyze this user's 30-day data and generate a profile in Spanish. Be insightful and constructive.

Data:
- Tasks created: ${tasks.length}, completed: ${completedTasks.length} (${completionRate}%)
- Total focus time: ${totalFocusMins} minutes across ${sessions.length} sessions
- Peak hours: ${peakHours.join(', ') || 'insufficient data'}
- Meetings: ${meetings.length}
- Memories saved: ${memories.length}
- Recent topics from conversations: ${messages.slice(0, 20).map(m => m.content.slice(0, 50)).join(' | ')}
- Memory categories: ${memories.map(m => m.category).filter((v, i, a) => a.indexOf(v) === i).join(', ')}

Return JSON:
{
  "work_patterns": { "peak_hours": [], "session_style": "string", "strongest_days": [], "schedule_tendency": "string" },
  "productivity": { "completion_rate": "string", "estimation_accuracy": "string", "procrastination_patterns": "string", "focus_style": "string" },
  "habits_analysis": { "consistency": "string", "strongest_habits": [], "struggling_habits": [], "recommendation": "string" },
  "personality": { "communication_style": "string", "work_approach": "string", "decision_making": "string", "motivators": [], "stress_signals": [] },
  "strengths": ["array of 3-5"],
  "improvement_areas": ["array of 2-3"],
  "narrative": "150-200 word coach-style summary in Spanish (second person, warm, direct)"
}`

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      let profile
      try {
        profile = JSON.parse(text.replace(/```json\n?|\n?```/g, ''))
      } catch {
        continue
      }

      // Upsert profile
      await supabase.from('user_profile_ai').upsert({
        user_id: user.id,
        ...profile,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    } catch (err) {
      console.error(`[CRON] Profile update failed for user ${user.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true })
}
