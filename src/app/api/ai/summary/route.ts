import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { period } = await request.json() as { period: 'daily' | 'weekly' | 'monthly' }

  const now = new Date()
  let from: Date, to: Date, periodLabel: string

  switch (period) {
    case 'daily':
      from = startOfDay(now)
      to = endOfDay(now)
      periodLabel = 'del día de hoy'
      break
    case 'weekly':
      from = startOfWeek(now, { weekStartsOn: 1 })
      to = endOfWeek(now, { weekStartsOn: 1 })
      periodLabel = 'de esta semana'
      break
    case 'monthly':
      from = startOfMonth(now)
      to = endOfMonth(now)
      periodLabel = 'de este mes'
      break
  }

  // Fetch all data for the period
  const [sessionsRes, tasksRes, meetingsRes, habitsRes, habitLogsRes] = await Promise.all([
    supabase
      .from('timer_sessions')
      .select('*, tasks(title, category_id, project_id, categories(name), projects(name))')
      .eq('status', 'completed')
      .gte('started_at', from.toISOString())
      .lte('started_at', to.toISOString()),
    supabase.from('tasks').select('*').eq('user_id', user.id),
    supabase
      .from('meetings')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_at', from.toISOString())
      .lte('scheduled_at', to.toISOString()),
    supabase.from('habits').select('*').eq('user_id', user.id),
    supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('completed_at', from.toISOString())
      .lte('completed_at', to.toISOString()),
  ])

  const sessions = sessionsRes.data || []
  const tasks = tasksRes.data || []
  const meetings = meetingsRes.data || []
  const habits = habitsRes.data || []
  const habitLogs = habitLogsRes.data || []

  // Calculate metrics
  const totalWorkedSecs = sessions.reduce((a: number, s: Record<string, unknown>) => a + ((s.net_secs as number) || 0), 0)
  const totalWorkedHours = Math.round(totalWorkedSecs / 3600 * 10) / 10

  const completedTasks = tasks.filter((t: Record<string, unknown>) =>
    t.status === 'done' && t.completed_at &&
    new Date(t.completed_at as string) >= from && new Date(t.completed_at as string) <= to
  )
  const createdTasks = tasks.filter((t: Record<string, unknown>) =>
    new Date(t.created_at as string) >= from && new Date(t.created_at as string) <= to
  )
  const pendingTasks = tasks.filter((t: Record<string, unknown>) => !['done', 'deleted'].includes(t.status as string))

  const completedMeetings = meetings.filter((m: Record<string, unknown>) => m.status === 'completed')
  const totalMeetingMins = completedMeetings.reduce((a: number, m: Record<string, unknown>) => a + ((m.duration_mins as number) || 0), 0)

  const habitsCompleted = habitLogs.length
  const habitsTotal = habits.length

  // Build session details
  const sessionDetails = sessions.map((s: Record<string, unknown>) => {
    const task = s.tasks as Record<string, unknown> | null
    const cat = task?.categories as Record<string, unknown> | null
    const proj = task?.projects as Record<string, unknown> | null
    return `- ${(task?.title as string) || '?'} (${cat?.name || 'Sin cat'} / ${proj?.name || 'Sin proj'}) — ${Math.round(((s.net_secs as number) || 0) / 60)}min`
  }).join('\n')

  const meetingDetails = meetings.map((m: Record<string, unknown>) =>
    `- ${m.title} [${m.status}] ${m.duration_mins ? `${m.duration_mins}min` : ''} ${m.participants || ''}`
  ).join('\n')

  const habitDetails = habits.map((h: Record<string, unknown>) => {
    const completed = habitLogs.filter((l: Record<string, unknown>) => l.habit_id === h.id).length
    return `- ${h.name}: ${completed} veces completado`
  }).join('\n')

  const prompt = `Genera un resumen ejecutivo ${periodLabel} para un emprendedor/founder. Responde en español.

## Datos del período

### Tiempo trabajado
Total: ${totalWorkedHours}h
Sesiones de trabajo:
${sessionDetails || '(ninguna)'}

### Tasks
Creadas: ${createdTasks.length}
Completadas: ${completedTasks.length}
Pendientes: ${pendingTasks.length}

### Meetings
Total: ${meetings.length}
Completados: ${completedMeetings.length}
Tiempo en meetings: ${totalMeetingMins}min
Detalle:
${meetingDetails || '(ninguno)'}

### Hábitos
${habitDetails || '(sin hábitos)'}
Completados en el período: ${habitsCompleted} de ${habitsTotal} hábitos

## Instrucciones
1. Haz un resumen breve y accionable (máx 300 palabras)
2. Destaca logros clave
3. Identifica áreas de mejora
4. Da 2-3 recomendaciones concretas para mejorar productividad
5. Usa un tono directo y motivador
6. Incluye métricas clave (horas, tasks, eficiencia)
7. Si es resumen semanal/mensual, identifica tendencias`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
    }

    // Save summary to DB
    await supabase.from('kira_summaries').upsert({
      user_id: user.id,
      period,
      period_start: from.toISOString(),
      period_end: to.toISOString(),
      content: content.text,
      metrics: {
        totalWorkedHours,
        tasksCompleted: completedTasks.length,
        tasksCreated: createdTasks.length,
        tasksPending: pendingTasks.length,
        meetingsTotal: meetings.length,
        meetingsMins: totalMeetingMins,
        habitsCompleted: habitsCompleted,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,period' })

    // Trigger profile regeneration in background on daily summaries
    if (period === 'daily') {
      const origin = request.headers.get('origin') || request.headers.get('x-forwarded-host') || ''
      const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`
      fetch(`${baseUrl}/api/ai/profile`, {
        method: 'POST',
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }).catch(() => { /* fire and forget */ })
    }

    return NextResponse.json({
      summary: content.text,
      period,
      metrics: {
        totalWorkedHours,
        tasksCompleted: completedTasks.length,
        tasksPending: pendingTasks.length,
        meetingsTotal: meetings.length,
      },
    })
  } catch (err) {
    console.error('[KIRA] Summary generation error:', err)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}

// GET - retrieve saved summaries
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period')

  let query = supabase
    .from('kira_summaries')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (period) {
    query = query.eq('period', period)
  }

  const { data } = await query.limit(10)
  return NextResponse.json({ summaries: data || [] })
}
