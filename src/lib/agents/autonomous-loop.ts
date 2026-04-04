/**
 * KIRA Autonomous Agent Loop
 *
 * This is the brain of KIRA. It runs every 15 minutes (via cron) and:
 * 1. Checks all channels for new activity
 * 2. Classifies and prioritizes items
 * 3. Takes autonomous actions when it knows how
 * 4. Asks the user when it doesn't know what to do
 * 5. Logs everything it does
 * 6. Updates the user profile with new learnings
 */

import Anthropic from '@anthropic-ai/sdk'
import { getValidGoogleToken } from '@/lib/google'
import { getRecentChatsForSync } from '@/lib/tools/whatsapp'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = any

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface AgentAction {
  agent: string
  action: string
  description: string
  status: 'success' | 'error' | 'pending_user'
  details?: string
  requires_user_input?: string
}

export async function runAutonomousLoop(
  supabase: SupabaseAdmin,
  userId: string
): Promise<{ actions: AgentAction[]; summary: string }> {
  const actions: AgentAction[] = []
  const startTime = Date.now()

  // --- Load user context ---
  const [profileRes, memoriesRes, tasksRes] = await Promise.all([
    supabase.from('user_profile_ai').select('narrative, personality').eq('user_id', userId).single(),
    supabase.from('kira_memory').select('category, content').eq('user_id', userId).order('updated_at', { ascending: false }).limit(30),
    supabase.from('tasks').select('id, title, status, priority, due_date').eq('user_id', userId).in('status', ['todo', 'in_progress']).limit(20),
  ])

  const userProfile = profileRes.data?.narrative || ''
  const memories = (memoriesRes.data || []).map((m: Record<string, string>) => `[${m.category}] ${m.content}`).join('\n')
  const pendingTasks = (tasksRes.data || []).map((t: Record<string, string>) => `- ${t.title} (${t.priority || 'no priority'}, due: ${t.due_date || 'none'})`).join('\n')

  // --- 1. Check Gmail ---
  const gmailActions = await checkGmail(supabase, userId)
  actions.push(...gmailActions)

  // --- 2. Check WhatsApp ---
  const waActions = await checkWhatsApp(supabase, userId)
  actions.push(...waActions)

  // --- 3. Check Calendar ---
  const calActions = await checkCalendar(supabase, userId)
  actions.push(...calActions)

  // --- 4. Check ManyChat (Instagram) ---
  const mcActions = await checkManyChat(supabase, userId)
  actions.push(...mcActions)

  // --- 5. Analyze and decide autonomous actions ---
  const analysisActions = await analyzeAndAct(supabase, userId, actions, {
    userProfile, memories, pendingTasks,
  })
  actions.push(...analysisActions)

  // --- 6. Log all actions ---
  const duration = Date.now() - startTime
  for (const action of actions) {
    await supabase.from('agent_logs').insert({
      user_id: userId,
      agent_id: null, // autonomous loop
      action: `${action.agent}:${action.action}`,
      status: action.status,
      input: { description: action.description },
      output: { details: action.details },
      error: action.status === 'error' ? action.details : null,
      duration_ms: Math.round(duration / actions.length),
    })
  }

  // --- 7. Create notification with summary ---
  const successCount = actions.filter(a => a.status === 'success').length
  const pendingCount = actions.filter(a => a.status === 'pending_user').length
  const summary = `Loop completado: ${successCount} acciones, ${pendingCount} pendientes de tu input. (${Math.round(duration / 1000)}s)`

  if (actions.length > 0) {
    await supabase.from('kira_notifications').insert({
      user_id: userId,
      type: 'agent_complete',
      title: 'KIRA Agent Loop',
      body: summary,
      data: { actions, duration_ms: duration },
    })
  }

  return { actions, summary }
}

// ============================================================
// CHANNEL MONITORS
// ============================================================

async function checkGmail(
  supabase: SupabaseAdmin,
  userId: string
): Promise<AgentAction[]> {
  const actions: AgentAction[] = []

  try {
    const token = await getValidGoogleToken(supabase, userId)
    if (!token) return actions

    // Check unread emails from last 30 min
    const res = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=is:unread newer_than:30m',
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return actions

    const data = await res.json()
    const messageIds = (data.messages || []) as Array<{ id: string }>

    if (messageIds.length === 0) return actions

    // Fetch details
    const emails = await Promise.all(
      messageIds.slice(0, 5).map(async (msg) => {
        const detail = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!detail.ok) return null
        const m = await detail.json()
        const headers = (m.payload?.headers || []) as Array<{ name: string; value: string }>
        return {
          id: msg.id,
          from: headers.find(h => h.name === 'From')?.value || '',
          subject: headers.find(h => h.name === 'Subject')?.value || '',
          snippet: m.snippet || '',
        }
      })
    )

    const validEmails = emails.filter(Boolean)
    if (validEmails.length > 0) {
      actions.push({
        agent: 'Inbox Monitor',
        action: 'gmail_check',
        description: `${validEmails.length} email(s) nuevos sin leer`,
        status: 'success',
        details: validEmails.map(e => `• ${e!.from}: ${e!.subject}`).join('\n'),
      })

      // Sync to inbox_threads
      for (const email of validEmails) {
        if (!email) continue
        const emailMatch = email.from.match(/<([^>]+)>/)
        const contactId = emailMatch ? emailMatch[1] : email.from
        const contactName = email.from.replace(/<[^>]+>/, '').trim()

        await supabase.from('inbox_threads').upsert({
          user_id: userId,
          channel: 'gmail',
          contact_id: contactId,
          contact_name: contactName,
          last_message: `${email.subject}: ${email.snippet.slice(0, 100)}`,
          last_message_at: new Date().toISOString(),
          unread_count: 1,
          pipeline_stage: 'new',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,channel,contact_id' })
      }
    }
  } catch (err) {
    actions.push({
      agent: 'Inbox Monitor',
      action: 'gmail_check',
      description: 'Error revisando Gmail',
      status: 'error',
      details: err instanceof Error ? err.message : 'Unknown',
    })
  }

  return actions
}

async function checkWhatsApp(
  supabase: SupabaseAdmin,
  userId: string
): Promise<AgentAction[]> {
  const actions: AgentAction[] = []

  try {
    const recentChats = getRecentChatsForSync(10)
    if (recentChats.length === 0) return actions

    // Check for chats with recent activity (last 30 min)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
    const newChats = recentChats.filter(c => {
      try { return new Date(c.lastTime) > thirtyMinAgo } catch { return false }
    })

    if (newChats.length > 0) {
      actions.push({
        agent: 'Inbox Monitor',
        action: 'whatsapp_check',
        description: `${newChats.length} chat(s) de WhatsApp con actividad reciente`,
        status: 'success',
        details: newChats.map(c => `• ${c.name || c.jid}: ${c.lastMessage.slice(0, 60)}`).join('\n'),
      })

      // Sync to inbox_threads
      for (const chat of newChats) {
        await supabase.from('inbox_threads').upsert({
          user_id: userId,
          channel: 'whatsapp',
          contact_id: chat.jid,
          contact_name: chat.name || chat.jid,
          last_message: chat.lastMessage.slice(0, 200),
          last_message_at: new Date(chat.lastTime).toISOString(),
          unread_count: 1,
          pipeline_stage: 'new',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,channel,contact_id' })
      }
    }
  } catch (err) {
    actions.push({
      agent: 'Inbox Monitor',
      action: 'whatsapp_check',
      description: 'Error revisando WhatsApp',
      status: 'error',
      details: err instanceof Error ? err.message : 'Unknown',
    })
  }

  return actions
}

async function checkCalendar(
  supabase: SupabaseAdmin,
  userId: string
): Promise<AgentAction[]> {
  const actions: AgentAction[] = []

  try {
    const token = await getValidGoogleToken(supabase, userId)
    if (!token) return actions

    // Check events in the next 2 hours
    const now = new Date()
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${now.toISOString()}&timeMax=${twoHoursLater.toISOString()}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return actions

    const data = await res.json()
    const events = (data.items || []) as Array<Record<string, unknown>>

    for (const event of events) {
      const start = (event.start as Record<string, string>)?.dateTime || ''
      const title = event.summary as string || 'Sin título'
      const attendees = ((event.attendees as Array<Record<string, string>>) || [])
        .map(a => a.email).join(', ')
      const minutesUntil = Math.round((new Date(start).getTime() - now.getTime()) / 60000)

      if (minutesUntil > 0 && minutesUntil <= 120) {
        actions.push({
          agent: 'Calendar Prep',
          action: 'upcoming_meeting',
          description: `Meeting "${title}" en ${minutesUntil} minutos`,
          status: 'success',
          details: attendees ? `Con: ${attendees}` : 'Sin asistentes listados',
        })
      }
    }
  } catch (err) {
    actions.push({
      agent: 'Calendar Prep',
      action: 'calendar_check',
      description: 'Error revisando calendario',
      status: 'error',
      details: err instanceof Error ? err.message : 'Unknown',
    })
  }

  return actions
}

async function checkManyChat(
  supabase: SupabaseAdmin,
  userId: string
): Promise<AgentAction[]> {
  const actions: AgentAction[] = []
  const mcKey = process.env.MANYCHAT_API_KEY
  if (!mcKey) return actions

  try {
    const res = await fetch('https://api.manychat.com/fb/page/getInfo', {
      headers: { Authorization: `Bearer ${mcKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json()
      actions.push({
        agent: 'Inbox Monitor',
        action: 'manychat_check',
        description: 'ManyChat (Instagram) conectado',
        status: 'success',
        details: `Página: ${data.data?.name || 'unknown'}`,
      })
    }
  } catch {
    // Silently skip if ManyChat is not reachable
  }

  return actions
}

// ============================================================
// AI ANALYSIS & AUTONOMOUS DECISIONS
// ============================================================

async function analyzeAndAct(
  supabase: SupabaseAdmin,
  userId: string,
  currentActions: AgentAction[],
  context: { userProfile: string; memories: string; pendingTasks: string }
): Promise<AgentAction[]> {
  const actions: AgentAction[] = []

  // Build a summary of what was found
  const channelSummary = currentActions
    .map(a => `[${a.agent}] ${a.description}${a.details ? '\n' + a.details : ''}`)
    .join('\n\n')

  if (!channelSummary) return actions // Nothing to analyze

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: `Eres KIRA, un agente autónomo que analiza la actividad del usuario y decide qué acciones tomar.

Perfil del usuario:
${context.userProfile || '(sin perfil aún)'}

Memorias relevantes:
${context.memories || '(sin memorias)'}

Tareas pendientes:
${context.pendingTasks || '(sin tareas)'}

Responde SOLO en JSON con este formato:
{
  "observations": ["observación 1", "observación 2"],
  "autonomous_actions": [
    {"action": "descripción de lo que harías", "reason": "por qué"}
  ],
  "questions_for_user": [
    {"question": "pregunta", "context": "por qué necesitas saberlo"}
  ],
  "profile_updates": ["nuevo dato aprendido sobre el usuario"]
}

Sé conciso. Solo incluye acciones que realmente puedas tomar con la info disponible.
NO inventes datos. Si no hay nada relevante, devuelve arrays vacíos.`,
      messages: [{
        role: 'user',
        content: `Actividad detectada en los canales del usuario:\n\n${channelSummary}\n\nAnaliza y decide qué hacer.`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return actions

    const analysis = JSON.parse(jsonMatch[0]) as {
      observations: string[]
      autonomous_actions: Array<{ action: string; reason: string }>
      questions_for_user: Array<{ question: string; context: string }>
      profile_updates: string[]
    }

    // Log observations
    if (analysis.observations.length > 0) {
      actions.push({
        agent: 'Self-Improver',
        action: 'analysis',
        description: 'Análisis de actividad',
        status: 'success',
        details: analysis.observations.join('\n'),
      })
    }

    // Queue questions for the user
    for (const q of analysis.questions_for_user) {
      actions.push({
        agent: 'KIRA',
        action: 'question',
        description: q.question,
        status: 'pending_user',
        requires_user_input: q.question,
        details: q.context,
      })

      // Store as notification
      await supabase.from('kira_notifications').insert({
        user_id: userId,
        type: 'agent_complete',
        title: 'KIRA necesita tu input',
        body: q.question,
        data: { context: q.context, source: 'autonomous_loop' },
      })
    }

    // Save profile updates as memories
    for (const update of analysis.profile_updates) {
      await supabase.from('kira_memory').insert({
        user_id: userId,
        category: 'pattern',
        content: update,
      })

      actions.push({
        agent: 'Self-Improver',
        action: 'learn',
        description: `Aprendido: ${update}`,
        status: 'success',
      })
    }
  } catch (err) {
    actions.push({
      agent: 'Self-Improver',
      action: 'analysis',
      description: 'Error en análisis AI',
      status: 'error',
      details: err instanceof Error ? err.message : 'Unknown',
    })
  }

  return actions
}
