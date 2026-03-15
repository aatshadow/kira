import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { subDays, format } from 'date-fns'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30).toISOString()
  const sevenDaysAgo = subDays(now, 7).toISOString()

  // --- Fetch all data for analysis ---
  const [
    tasksRes,
    sessionsRes,
    meetingsRes,
    habitsRes,
    habitLogsRes,
    memoriesRes,
    conversationsRes,
  ] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', user.id),
    supabase
      .from('timer_sessions')
      .select('*, tasks(title, category_id, project_id, categories(name), projects(name))')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('started_at', thirtyDaysAgo),
    supabase.from('meetings').select('*').eq('user_id', user.id),
    supabase.from('habits').select('*').eq('user_id', user.id),
    supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('completed_at', thirtyDaysAgo),
    supabase
      .from('kira_memory')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('user_id', user.id)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const tasks = tasksRes.data || []
  const sessions = sessionsRes.data || []
  const meetings = meetingsRes.data || []
  const habits = habitsRes.data || []
  const habitLogs = habitLogsRes.data || []
  const memories = memoriesRes.data || []
  const userMessages = conversationsRes.data || []

  // --- Calculate metrics for Claude ---
  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t: Record<string, unknown>) => t.status === 'done')
  const deletedTasks = tasks.filter((t: Record<string, unknown>) => t.status === 'deleted')
  const pendingTasks = tasks.filter((t: Record<string, unknown>) => !['done', 'deleted'].includes(t.status as string))

  // Tasks by priority
  const tasksByPriority: Record<string, number> = {}
  for (const t of doneTasks) {
    const p = (t.priority as string) || 'none'
    tasksByPriority[p] = (tasksByPriority[p] || 0) + 1
  }

  // Completion rate
  const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / (totalTasks - deletedTasks.length)) * 100) : null

  // Time analysis from sessions
  const totalWorkedSecs = sessions.reduce((a: number, s: Record<string, unknown>) => a + ((s.net_secs as number) || 0), 0)
  const totalWorkedHours = Math.round(totalWorkedSecs / 3600 * 10) / 10

  // Work hours distribution
  const hourDistribution: Record<number, number> = {}
  const dayDistribution: Record<number, number> = {}
  for (const s of sessions) {
    const d = new Date((s as Record<string, unknown>).started_at as string)
    const hour = d.getHours()
    const day = d.getDay()
    hourDistribution[hour] = (hourDistribution[hour] || 0) + ((s as Record<string, unknown>).net_secs as number || 0)
    dayDistribution[day] = (dayDistribution[day] || 0) + ((s as Record<string, unknown>).net_secs as number || 0)
  }

  // Peak hours (top 3)
  const peakHours = Object.entries(hourDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([h, secs]) => `${h}:00 (${Math.round(secs / 60)}min)`)

  // Day names
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
  const peakDays = Object.entries(dayDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([d, secs]) => `${dayNames[parseInt(d)]} (${Math.round(secs / 3600 * 10) / 10}h)`)

  // Average session length
  const avgSessionMins = sessions.length > 0
    ? Math.round(sessions.reduce((a: number, s: Record<string, unknown>) => a + ((s.net_secs as number) || 0), 0) / sessions.length / 60)
    : null

  // Efficiency: estimated vs actual
  const tasksWithEstimate = doneTasks.filter((t: Record<string, unknown>) => t.estimated_mins)
  let efficiencyNote = 'Sin datos suficientes'
  if (tasksWithEstimate.length >= 3) {
    const totalEstimated = tasksWithEstimate.reduce((a: number, t: Record<string, unknown>) => a + (t.estimated_mins as number), 0)
    const taskIds = tasksWithEstimate.map((t: Record<string, unknown>) => t.id)
    const taskSessions = sessions.filter((s: Record<string, unknown>) => taskIds.includes((s as Record<string, unknown>).task_id as string))
    const totalActual = taskSessions.reduce((a: number, s: Record<string, unknown>) => a + ((s.net_secs as number) || 0), 0) / 60
    if (totalActual > 0) {
      const ratio = Math.round((totalEstimated / totalActual) * 100)
      efficiencyNote = ratio > 100
        ? `Termina ${ratio - 100}% mas rapido que lo estimado`
        : `Tarda ${100 - ratio}% mas de lo estimado`
    }
  }

  // Meetings analysis
  const completedMeetings = meetings.filter((m: Record<string, unknown>) => m.status === 'completed')
  const totalMeetingMins = completedMeetings.reduce((a: number, m: Record<string, unknown>) => a + ((m.duration_mins as number) || 0), 0)
  const meetingsWithTranscript = completedMeetings.filter((m: Record<string, unknown>) => m.transcript)

  // Habits analysis
  const habitDetails = habits.map((h: Record<string, unknown>) => {
    const logs = habitLogs.filter((l: Record<string, unknown>) => l.habit_id === h.id)
    return `${h.name}: ${logs.length} veces en 30 dias, racha actual: ${h.streak || 0} dias`
  })

  // Recent user messages (communication style)
  const recentMessages = userMessages.slice(0, 20).map((m: Record<string, unknown>) => m.content as string)

  // Memories
  const memoryText = memories.map((m: Record<string, unknown>) => `[${m.category}] ${m.content}`).join('\n')

  // Tasks that get postponed (created > 7 days ago, still pending)
  const postponedTasks = pendingTasks.filter((t: Record<string, unknown>) => {
    const created = new Date(t.created_at as string)
    return created < new Date(sevenDaysAgo)
  })

  // Categories worked most
  const categoryTime: Record<string, number> = {}
  for (const s of sessions) {
    const task = (s as Record<string, unknown>).tasks as Record<string, unknown> | null
    const cat = task?.categories as Record<string, unknown> | null
    const name = (cat?.name as string) || 'Sin categoria'
    categoryTime[name] = (categoryTime[name] || 0) + ((s as Record<string, unknown>).net_secs as number || 0)
  }
  const topCategories = Object.entries(categoryTime)
    .sort(([, a], [, b]) => b - a)
    .map(([name, secs]) => `${name}: ${Math.round(secs / 3600 * 10) / 10}h`)

  // Count data points
  const dataPoints = tasks.length + sessions.length + meetings.length + habitLogs.length + memories.length + userMessages.length

  // --- Build the analysis prompt ---
  const prompt = `Analiza los siguientes datos de un usuario de KIRA (app de productividad para founders/emprendedores) y genera un perfil psicologico-operativo detallado. Este perfil se usara como contexto en futuras conversaciones para personalizar la asistencia.

## Datos del usuario (ultimos 30 dias)

### Trabajo
- Horas trabajadas (30 dias): ${totalWorkedHours}h
- Sesiones de trabajo: ${sessions.length}
- Duracion media de sesion: ${avgSessionMins ? `${avgSessionMins}min` : 'N/A'}
- Horas pico de trabajo: ${peakHours.join(', ') || 'Sin datos'}
- Dias mas productivos: ${peakDays.join(', ') || 'Sin datos'}
- Tiempo por categoria: ${topCategories.join(', ') || 'Sin datos'}

### Tasks
- Total creadas: ${totalTasks}
- Completadas: ${doneTasks.length}
- Pendientes: ${pendingTasks.length}
- Eliminadas: ${deletedTasks.length}
- Tasa de completado: ${completionRate !== null ? `${completionRate}%` : 'N/A'}
- Por prioridad completadas: ${JSON.stringify(tasksByPriority)}
- Eficiencia (estimado vs real): ${efficiencyNote}
- Tasks postergadas (>7 dias pendientes): ${postponedTasks.length}
${postponedTasks.length > 0 ? `  Ejemplos: ${postponedTasks.slice(0, 5).map((t: Record<string, unknown>) => `"${t.title}" (${t.priority || 'sin prioridad'})`).join(', ')}` : ''}

### Meetings
- Total: ${meetings.length}
- Completados: ${completedMeetings.length}
- Tiempo total en meetings: ${totalMeetingMins}min
- Con transcripcion: ${meetingsWithTranscript.length}

### Habitos
${habitDetails.length > 0 ? habitDetails.join('\n') : 'Sin habitos configurados'}

### Memorias guardadas (lo que KIRA sabe del usuario)
${memoryText || '(sin memorias)'}

### Mensajes recientes del usuario a KIRA (estilo de comunicacion)
${recentMessages.length > 0 ? recentMessages.map(m => `> ${m}`).join('\n') : '(sin conversaciones)'}

## Instrucciones

Genera un perfil en formato JSON con esta estructura exacta:

{
  "work_patterns": {
    "peak_hours": "descripcion de cuando trabaja mejor",
    "session_style": "sprints cortos vs sesiones largas",
    "strongest_days": "que dias rinde mas",
    "weakest_days": "que dias rinde menos",
    "avg_daily_hours": "media de horas diarias trabajadas",
    "schedule_tendency": "madrugador, nocturno, irregular..."
  },
  "productivity": {
    "completion_rate": "alto/medio/bajo con contexto",
    "estimation_accuracy": "tiende a sobreestimar, subestimar, o preciso",
    "procrastination_patterns": "que tipo de tareas posterga y por que (hipotesis)",
    "focus_style": "deep work vs multitasking vs mixto",
    "strongest_categories": "donde destaca",
    "growth_areas": "donde puede mejorar"
  },
  "habits_analysis": {
    "consistency": "alta/media/baja",
    "strongest_habits": "cuales mantiene mejor",
    "struggling_habits": "cuales le cuestan",
    "recommendation": "una sugerencia concreta"
  },
  "personality": {
    "communication_style": "directo, detallado, escueto, informal...",
    "work_approach": "metodico, impulsivo, estrategico, reactivo...",
    "decision_making": "rapido, deliberado, data-driven...",
    "energy_management": "como gestiona su energia a lo largo del dia",
    "motivators": "que le motiva (basado en lo que prioriza)",
    "stress_signals": "patrones que indican estres o sobrecarga"
  },
  "strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "improvement_areas": ["area 1", "area 2", "area 3"],
  "narrative": "Un parrafo de 150-200 palabras que describe al usuario como si fueras su coach ejecutivo. Incluye patrones observados, estilo de trabajo, fortalezas, y areas de crecimiento. Este texto se inyecta directamente en el system prompt de KIRA para que sepa con quien habla. Escrito en segunda persona (tu). En espanol."
}

IMPORTANTE:
- Si no hay datos suficientes para una seccion, pon "Datos insuficientes — se actualizara con mas uso"
- Se honesto y directo, no complaciente
- Basa TODO en los datos, no inventes
- El narrative es la pieza mas importante — es lo que KIRA leera cada vez que hable con el usuario
- Responde SOLO con el JSON, sin texto adicional`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
    }

    // Parse the JSON response
    let profile
    try {
      // Handle potential markdown code blocks
      const jsonText = content.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      profile = JSON.parse(jsonText)
    } catch {
      return NextResponse.json({ error: 'Failed to parse profile', raw: content.text }, { status: 500 })
    }

    // Upsert profile to DB
    const { error: upsertError } = await supabase.from('user_profile_ai').upsert({
      user_id: user.id,
      work_patterns: profile.work_patterns || {},
      productivity: profile.productivity || {},
      habits_analysis: profile.habits_analysis || {},
      personality: profile.personality || {},
      strengths: profile.strengths || [],
      improvement_areas: profile.improvement_areas || [],
      narrative: profile.narrative || null,
      data_points: dataPoints,
      last_analyzed: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({
      profile,
      dataPoints,
      message: 'Perfil actualizado correctamente',
    })
  } catch (err) {
    console.error('[KIRA] Profile generation error:', err)
    return NextResponse.json({ error: 'Failed to generate profile' }, { status: 500 })
  }
}

// GET — retrieve current profile
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profile_ai')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ profile: profile || null })
}
