import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getValidGoogleToken } from '@/lib/google'
import { executeTool, isInlineTool, KIRA_TOOLS } from '@/lib/tools'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// SSE helper
function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { messages, context, conversationId, language } = await request.json() as {
    messages: ChatMessage[]
    conversationId: string | null
    language?: 'en' | 'es'
    context: {
      tasks: Array<{ id: string; title: string; status: string; priority: string | null; category: string | null; project: string | null; due_date: string | null; estimated_mins: number | null; tags: string[] }>
      meetings: Array<{ id: string; title: string; status: string; scheduled_at: string | null; duration_mins: number | null; participants: string | null }>
      categories: Array<{ id: string; name: string }>
      projects: Array<{ id: string; name: string }>
      tags: Array<{ id: string; name: string }>
      today: string
    }
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages required' }), { status: 400 })
  }

  // --- Conversation persistence ---
  let convId = conversationId

  if (!convId) {
    const firstMsg = messages[0]?.content || ''
    const title = firstMsg.slice(0, 80) || 'Nueva conversación'
    const { data: conv } = await supabase
      .from('chat_conversations')
      .insert({ user_id: user.id, title })
      .select('id')
      .single()
    convId = conv?.id || null
  }

  const lastUserMsg = messages[messages.length - 1]
  if (convId && lastUserMsg?.role === 'user') {
    await supabase.from('chat_messages').insert({
      conversation_id: convId,
      user_id: user.id,
      role: 'user',
      content: lastUserMsg.content,
    })
  }

  // Google token needed for calendar actions later
  const googleToken = await getValidGoogleToken(supabase, user.id)

  // --- Load KIRA memories (slim: only 15 most recent) ---
  const { data: memoriesData } = await supabase
    .from('kira_memory')
    .select('category, content')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(15)

  const memories = memoriesData || []

  // --- Load AI-generated user profile ---
  const { data: profileAi } = await supabase
    .from('user_profile_ai')
    .select('narrative, strengths, improvement_areas, personality')
    .eq('user_id', user.id)
    .single()

  const profileText = profileAi?.narrative
    ? `${profileAi.narrative}\n\nFortalezas: ${(profileAi.strengths || []).join(', ')}\nAreas de mejora: ${(profileAi.improvement_areas || []).join(', ')}\nEstilo de comunicacion: ${profileAi.personality?.communication_style || 'desconocido'}\nEstilo de trabajo: ${profileAi.personality?.work_approach || 'desconocido'}`
    : '(perfil aun no generado — se construye con el uso)'

  // --- Build compact context ---
  const categoryList = context.categories.map(c => `"${c.name}" (id:${c.id})`).join(', ')
  const projectList = context.projects.map(p => `"${p.name}" (id:${p.id})`).join(', ')


  const lang = language || 'en'
  const kiraPersonality = lang === 'es'
    ? `Eres KIRA, asistente personal de un emprendedor. Español de España, natural, breve. Frases cortas con personalidad. Tutea siempre.`
    : `You are KIRA, a personal AI assistant. English, natural, brief. Short sentences with personality.`

  // Only include pending tasks (not completed/deleted) — keep context small
  const pendingTasks = context.tasks.filter(t => t.status === 'todo' || t.status === 'in_progress')
  const taskLines = pendingTasks.slice(0, 10).map(t => {
    const parts = [t.title]
    if (t.priority) parts.push(`P:${t.priority}`)
    if (t.due_date) parts.push(`Due:${t.due_date}`)
    return `- ${parts.join(' | ')} [id:${t.id}]`
  }).join('\n')

  const nextMeetings = context.meetings
    .filter(m => m.status === 'scheduled')
    .slice(0, 5)
    .map(m => `- ${m.title}${m.scheduled_at ? ` at ${m.scheduled_at}` : ''} [id:${m.id}]`)
    .join('\n')

  // Slim memory: only last 15
  const recentMemory = memories.slice(0, 15).map(m => `- [${m.category}] ${m.content}`).join('\n')

  const systemPrompt = `${kiraPersonality}

Date: ${context.today} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}

## Context
${profileText !== '(perfil aun no generado — se construye con el uso)' ? `User profile: ${profileText.slice(0, 300)}` : ''}
${recentMemory ? `Memories:\n${recentMemory}` : ''}

## Current tasks (${pendingTasks.length} pending)
${taskLines || '(none)'}

## Next meetings
${nextMeetings || '(none)'}

## Categories: ${categoryList || '(none)'}
## Projects: ${projectList || '(none)'}

## Tools
You have tools for: web search, reading URLs, running code, reading/sending emails (Gmail), WhatsApp (read chats, send messages), ManyChat (Instagram DMs), LinkedIn (profile, posts), self-modification (self_code for UI/behavior changes).
Use tools proactively. Don't ask permission — just use them. Before SENDING messages (email/WhatsApp/DM), show draft and confirm.

## Actions (embed in response for data mutations)
\`\`\`kira-action
{"action": "ACTION_NAME", "data": {...}}
\`\`\`
Actions: create_task, edit_task, delete_task, create_meeting, edit_meeting, delete_meeting, save_memory, delete_memory, create_calendar_event, update_calendar_event, delete_calendar_event, create_category, create_project, sync_calendar, digest_meeting.
Task data: {title, description?, priority?(q1-q4), category_id?, project_id?, status?(todo/backlog), due_date?(YYYY-MM-DD), estimated_mins?, tags?[], notes?}
Meeting data: {title, scheduled_at?, duration_mins?, participants?, pre_notes?}
Memory data: {category: "preference|personal|work|emotional|pattern", content: "text"}
Calendar data: {title, start (ISO), end?, description?, attendees?(csv emails), add_meet?(bool), location?}

## Rules
1. Respond in ${lang === 'es' ? 'Spanish (Spain)' : 'English'}. SHORT responses (2-3 sentences max for simple things).
2. Use exact IDs from task/meeting lists. Never show raw IDs to user.
3. Parse relative dates: "mañana"=tomorrow, "el viernes"=next Friday.
4. On greetings: brief + quick status ("Hey! ${pendingTasks.length} tasks pending${nextMeetings ? ', next meeting coming up' : ''}").
5. Save memories proactively when user reveals preferences, habits, goals, people.
6. For self-modification requests, use self_code tool immediately.`

  // --- Stream response with tool loop ---
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Convert messages for Anthropic API — clean text only, no tool artifacts
        // Filter out empty messages and ensure alternating user/assistant pattern
        const cleanMessages = messages.filter(m => m.content && m.content.trim())
        const anthropicMessages: Anthropic.MessageParam[] = []
        for (const m of cleanMessages) {
          const role = m.role as 'user' | 'assistant'
          // Ensure alternating roles (Claude requires this)
          const lastRole = anthropicMessages.length > 0 ? anthropicMessages[anthropicMessages.length - 1].role : null
          if (lastRole === role) {
            // Merge consecutive same-role messages
            const last = anthropicMessages[anthropicMessages.length - 1]
            last.content = `${last.content}\n\n${m.content}`
          } else {
            anthropicMessages.push({ role, content: m.content })
          }
        }
        // Ensure conversation starts with user message
        if (anthropicMessages.length > 0 && anthropicMessages[0].role !== 'user') {
          anthropicMessages.shift()
        }
        // Ensure conversation ends with user message
        if (anthropicMessages.length > 0 && anthropicMessages[anthropicMessages.length - 1].role !== 'user') {
          anthropicMessages.pop()
        }
        // Safety: if empty after cleanup, just use the last user message
        if (anthropicMessages.length === 0) {
          const lastUser = messages.filter(m => m.role === 'user').pop()
          if (lastUser) anthropicMessages.push({ role: 'user', content: lastUser.content })
        }

        let fullText = ''
        const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown>; result?: string }> = []
        let iterations = 0
        const MAX_ITERATIONS = 3

        // Agentic loop: stream Claude responses, execute tools, repeat
        while (iterations < MAX_ITERATIONS) {
          iterations++

          // Use streaming for real-time token delivery
          const stream = anthropic.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4096,
            system: systemPrompt,
            messages: anthropicMessages,
            tools: KIRA_TOOLS as unknown as Anthropic.Tool[],
          })

          let hasToolUse = false
          const pendingToolBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }> = []

          // Stream text tokens in real-time
          stream.on('text', (text) => {
            fullText += text
            controller.enqueue(new TextEncoder().encode(
              sseEncode('text', { text })
            ))
          })

          // Wait for complete response
          const response = await stream.finalMessage()

          // Process tool_use blocks after streaming completes
          for (const block of response.content) {
            if (block.type === 'tool_use') {
              hasToolUse = true
              pendingToolBlocks.push({
                id: block.id,
                name: block.name,
                input: block.input as Record<string, unknown>,
              })
            }
          }

          // Execute tools — inline (fast) vs background (slow/agent)
          if (hasToolUse) {
            let hasBackgroundTool = false

            for (const block of pendingToolBlocks) {
              controller.enqueue(new TextEncoder().encode(
                sseEncode('tool_start', { id: block.id, name: block.name, input: block.input })
              ))

              let resultContent: string

              if (isInlineTool(block.name)) {
                // Fast tool — execute inline
                const result = await executeTool(block.name, block.input, user.id)
                resultContent = result.content

                controller.enqueue(new TextEncoder().encode(
                  sseEncode('tool_result', {
                    id: block.id,
                    name: block.name,
                    result: resultContent.slice(0, 500),
                    error: result.error,
                  })
                ))
              } else {
                // Slow tool — queue as background agent task, don't block conversation
                hasBackgroundTool = true

                // Fire-and-forget: execute in background, save result to notifications
                const bgUserId = user.id
                const bgConvId = convId
                const bgBlock = { ...block }
                const bgSupabase = supabase
                ;(async () => {
                  try {
                    const result = await executeTool(bgBlock.name, bgBlock.input, bgUserId)
                    // Save result as a notification the user can see
                    await bgSupabase.from('kira_notifications').insert({
                      user_id: bgUserId,
                      type: 'agent_complete',
                      title: `${bgBlock.name} completado`,
                      body: result.content.slice(0, 500),
                      data: {
                        tool: bgBlock.name,
                        input: bgBlock.input,
                        result: result.content.slice(0, 2000),
                        conversation_id: bgConvId,
                        error: result.error || false,
                      },
                    })
                  } catch (err) {
                    await bgSupabase.from('kira_notifications').insert({
                      user_id: bgUserId,
                      type: 'agent_complete',
                      title: `${bgBlock.name} — error`,
                      body: err instanceof Error ? err.message : 'Error desconocido',
                      data: { tool: bgBlock.name, error: true, conversation_id: bgConvId },
                    })
                  }
                })()

                resultContent = `[BACKGROUND] This tool is running as a background agent task. Tell the user you're working on it and they'll get the result shortly. Don't wait for it — continue the conversation naturally.`

                controller.enqueue(new TextEncoder().encode(
                  sseEncode('tool_result', {
                    id: block.id,
                    name: block.name,
                    result: 'Running in background...',
                    background: true,
                  })
                ))
              }

              toolCalls.push({
                id: block.id,
                name: block.name,
                input: block.input,
                result: resultContent,
              })

              // Add tool_result for next iteration
              anthropicMessages.push({
                role: 'assistant',
                content: response.content as Anthropic.ContentBlock[],
              })
              anthropicMessages.push({
                role: 'user',
                content: [{
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: resultContent,
                }],
              })
            }

            // If all tools were background, limit to 1 more iteration for KIRA to respond
            if (hasBackgroundTool) {
              iterations = Math.max(iterations, MAX_ITERATIONS - 1)
            }
          }

          // If no tool use in this iteration, we're done
          if (!hasToolUse || response.stop_reason === 'end_turn') {
            break
          }
        }

        // --- Execute kira-actions from the final text ---
        const actions: Array<{ action: string; data: Record<string, unknown> }> = []
        const actionRegex = /```kira-action\n([\s\S]*?)```/g
        let match
        while ((match = actionRegex.exec(fullText)) !== null) {
          try {
            const parsed = JSON.parse(match[1])
            const { action, data, ...rest } = parsed
            actions.push({ action, data: data || rest })
          } catch {
            // skip malformed
          }
        }

        const actionResults: Array<{ action: string; success: boolean; id?: string; error?: string }> = []

        for (const act of actions) {
          try {
            switch (act.action) {
              case 'create_task': {
                const { data: task, error } = await supabase
                  .from('tasks')
                  .insert({ ...act.data, user_id: user.id })
                  .select()
                  .single()
                actionResults.push({ action: 'create_task', success: !error, id: task?.id, error: error?.message })
                break
              }
              case 'edit_task': {
                const { id, ...updates } = act.data as { id: string; [key: string]: unknown }
                const { error } = await supabase.from('tasks').update(updates).eq('id', id)
                actionResults.push({ action: 'edit_task', success: !error, id, error: error?.message })
                break
              }
              case 'delete_task': {
                const { id } = act.data as { id: string }
                const { error } = await supabase.from('tasks').update({ status: 'deleted' }).eq('id', id)
                actionResults.push({ action: 'delete_task', success: !error, id, error: error?.message })
                break
              }
              case 'create_meeting': {
                const md = act.data as Record<string, unknown>
                const meetingData = {
                  title: md.title || md.summary || 'Sin título',
                  scheduled_at: md.scheduled_at || null,
                  duration_mins: md.duration_mins || null,
                  participants: md.participants || null,
                  pre_notes: md.pre_notes || null,
                  user_id: user.id,
                  status: 'scheduled',
                }
                const { data: meeting, error } = await supabase
                  .from('meetings')
                  .insert(meetingData)
                  .select()
                  .single()
                actionResults.push({ action: 'create_meeting', success: !error, id: meeting?.id, error: error?.message })
                break
              }
              case 'edit_meeting': {
                const { id, ...updates } = act.data as { id: string; [key: string]: unknown }
                const { error } = await supabase.from('meetings').update(updates).eq('id', id)
                actionResults.push({ action: 'edit_meeting', success: !error, id, error: error?.message })
                break
              }
              case 'delete_meeting': {
                const { id } = act.data as { id: string }
                const { error } = await supabase.from('meetings').update({ status: 'cancelled' }).eq('id', id)
                actionResults.push({ action: 'delete_meeting', success: !error, id, error: error?.message })
                break
              }
              case 'save_memory': {
                const { category, content: memContent } = act.data as { category: string; content: string }
                const { error } = await supabase.from('kira_memory').insert({
                  user_id: user.id,
                  category: category || 'general',
                  content: memContent,
                  source_conversation_id: convId,
                })
                actionResults.push({ action: 'save_memory', success: !error, error: error?.message })
                break
              }
              case 'delete_memory': {
                const { content_match } = act.data as { content_match: string }
                const { error } = await supabase
                  .from('kira_memory')
                  .delete()
                  .eq('user_id', user.id)
                  .ilike('content', `%${content_match}%`)
                actionResults.push({ action: 'delete_memory', success: !error, error: error?.message })
                break
              }
              case 'create_calendar_event': {
                if (!googleToken) {
                  actionResults.push({ action: 'create_calendar_event', success: false, error: 'Google Calendar no conectado' })
                  break
                }
                const calData = act.data as Record<string, unknown> || {}
                const evTitle = (calData.title || calData.summary || 'Sin título') as string
                const evStart = (calData.start || calData.dateTime || calData.start_time) as string
                const evEnd = (calData.end || calData.end_time) as string | undefined
                const evDesc = (calData.description || calData.notes) as string | undefined
                const evAttendees = (calData.attendees) as string | undefined
                if (!evStart) {
                  actionResults.push({ action: 'create_calendar_event', success: false, error: 'Missing start time' })
                  break
                }
                const evLocation = (calData.location) as string | undefined
                const evAddMeet = calData.add_meet as boolean | undefined
                const calEvent: Record<string, unknown> = {
                  summary: evTitle,
                  start: { dateTime: evStart, timeZone: 'Europe/Madrid' },
                  end: { dateTime: evEnd || new Date(new Date(evStart).getTime() + 60 * 60 * 1000).toISOString(), timeZone: 'Europe/Madrid' },
                }
                if (evDesc) calEvent.description = evDesc
                if (evLocation) calEvent.location = evLocation
                if (evAttendees) {
                  calEvent.attendees = evAttendees.split(',').map((email: string) => ({ email: email.trim() }))
                }
                if (evAddMeet) {
                  calEvent.conferenceData = {
                    createRequest: { requestId: `kira-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
                  }
                }
                try {
                  const calUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events' + (evAddMeet ? '?conferenceDataVersion=1' : '')
                  const calRes = await fetch(calUrl, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(calEvent),
                  })
                  const calResult = await calRes.json()
                  actionResults.push({
                    action: 'create_calendar_event',
                    success: calRes.ok,
                    id: calResult.id,
                    error: calRes.ok ? undefined : calResult.error?.message,
                  })
                } catch (calErr) {
                  actionResults.push({ action: 'create_calendar_event', success: false, error: calErr instanceof Error ? calErr.message : 'Calendar error' })
                }
                break
              }
              case 'update_calendar_event': {
                if (!googleToken) {
                  actionResults.push({ action: 'update_calendar_event', success: false, error: 'Google Calendar no conectado' })
                  break
                }
                const upData = act.data as Record<string, unknown> || {}
                const eventId = upData.event_id as string
                if (!eventId) {
                  actionResults.push({ action: 'update_calendar_event', success: false, error: 'Missing event_id' })
                  break
                }
                try {
                  const getRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
                    headers: { Authorization: `Bearer ${googleToken}` },
                  })
                  if (!getRes.ok) {
                    const getErr = await getRes.json()
                    actionResults.push({ action: 'update_calendar_event', success: false, error: getErr.error?.message || 'Event not found' })
                    break
                  }
                  const existing = await getRes.json()
                  if (upData.title) existing.summary = upData.title
                  if (upData.start) existing.start = { dateTime: upData.start, timeZone: 'Europe/Madrid' }
                  if (upData.end) existing.end = { dateTime: upData.end, timeZone: 'Europe/Madrid' }
                  if (upData.description !== undefined) existing.description = upData.description || ''
                  if (upData.location !== undefined) existing.location = upData.location || ''
                  const currentAttendees: Array<{ email: string; responseStatus?: string }> = existing.attendees || []
                  if (upData.add_attendees) {
                    const toAdd = (upData.add_attendees as string).split(',').map(e => e.trim()).filter(Boolean)
                    for (const email of toAdd) {
                      if (!currentAttendees.some(a => a.email === email)) {
                        currentAttendees.push({ email })
                      }
                    }
                    existing.attendees = currentAttendees
                  }
                  if (upData.remove_attendees) {
                    const toRemove = (upData.remove_attendees as string).split(',').map(e => e.trim().toLowerCase())
                    existing.attendees = currentAttendees.filter(a => !toRemove.includes(a.email.toLowerCase()))
                  }
                  const wantMeet = upData.add_meet as boolean
                  let confVersion = ''
                  if (wantMeet && !existing.hangoutLink) {
                    existing.conferenceData = {
                      createRequest: { requestId: `kira-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
                    }
                    confVersion = '?conferenceDataVersion=1'
                  }
                  const separator = confVersion ? '&' : '?'
                  const patchRes = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}${confVersion}${separator}sendUpdates=all`,
                    {
                      method: 'PUT',
                      headers: { Authorization: `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify(existing),
                    }
                  )
                  const patchResult = await patchRes.json()
                  actionResults.push({
                    action: 'update_calendar_event',
                    success: patchRes.ok,
                    id: eventId,
                    error: patchRes.ok ? undefined : patchResult.error?.message,
                  })
                } catch (calErr) {
                  actionResults.push({ action: 'update_calendar_event', success: false, error: calErr instanceof Error ? calErr.message : 'Calendar error' })
                }
                break
              }
              case 'delete_calendar_event': {
                if (!googleToken) {
                  actionResults.push({ action: 'delete_calendar_event', success: false, error: 'Google Calendar no conectado' })
                  break
                }
                const delData = act.data as Record<string, unknown> || {}
                const delEventId = delData.event_id as string
                if (!delEventId) {
                  actionResults.push({ action: 'delete_calendar_event', success: false, error: 'Missing event_id' })
                  break
                }
                try {
                  const sendNotif = delData.send_notifications !== false ? 'all' : 'none'
                  const delRes = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(delEventId)}?sendUpdates=${sendNotif}`,
                    {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${googleToken}` },
                    }
                  )
                  actionResults.push({
                    action: 'delete_calendar_event',
                    success: delRes.status === 204 || delRes.ok,
                    id: delEventId,
                    error: delRes.ok || delRes.status === 204 ? undefined : 'Failed to delete event',
                  })
                } catch (calErr) {
                  actionResults.push({ action: 'delete_calendar_event', success: false, error: calErr instanceof Error ? calErr.message : 'Calendar error' })
                }
                break
              }
              case 'create_category': {
                const { name } = act.data as { name: string }
                if (!name) {
                  actionResults.push({ action: 'create_category', success: false, error: 'Missing name' })
                  break
                }
                const { data: cat, error } = await supabase
                  .from('categories')
                  .insert({ user_id: user.id, name })
                  .select()
                  .single()
                actionResults.push({ action: 'create_category', success: !error, id: cat?.id, error: error?.message })
                break
              }
              case 'create_project': {
                const projData = act.data as { name: string; description?: string }
                if (!projData.name) {
                  actionResults.push({ action: 'create_project', success: false, error: 'Missing name' })
                  break
                }
                const { data: proj, error } = await supabase
                  .from('projects')
                  .insert({ user_id: user.id, name: projData.name, description: projData.description || null })
                  .select()
                  .single()
                actionResults.push({ action: 'create_project', success: !error, id: proj?.id, error: error?.message })
                break
              }
              case 'sync_calendar': {
                try {
                  const origin = request.headers.get('origin') || request.headers.get('x-forwarded-host') || ''
                  const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`
                  const syncRes = await fetch(`${baseUrl}/api/calendar/sync`, {
                    method: 'POST',
                    headers: { cookie: request.headers.get('cookie') || '' },
                  })
                  const syncData = await syncRes.json()
                  actionResults.push({ action: 'sync_calendar', success: syncRes.ok, error: syncRes.ok ? undefined : syncData.error })
                } catch (syncErr) {
                  actionResults.push({ action: 'sync_calendar', success: false, error: syncErr instanceof Error ? syncErr.message : 'Sync failed' })
                }
                break
              }
              case 'digest_meeting': {
                const { id: digestMeetingId } = act.data as { id: string }
                if (!digestMeetingId) {
                  actionResults.push({ action: 'digest_meeting', success: false, error: 'Missing meeting id' })
                  break
                }
                try {
                  const origin = request.headers.get('origin') || request.headers.get('x-forwarded-host') || ''
                  const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`
                  const digestRes = await fetch(`${baseUrl}/api/ai/meeting-digest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', cookie: request.headers.get('cookie') || '' },
                    body: JSON.stringify({ meetingId: digestMeetingId }),
                  })
                  const digestData = await digestRes.json()
                  actionResults.push({ action: 'digest_meeting', success: digestRes.ok, id: digestMeetingId, error: digestRes.ok ? undefined : digestData.error })
                } catch (digestErr) {
                  actionResults.push({ action: 'digest_meeting', success: false, error: digestErr instanceof Error ? digestErr.message : 'Digest failed' })
                }
                break
              }
            }
          } catch (err) {
            actionResults.push({ action: act.action, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
          }
        }

        // Send action results
        if (actionResults.length > 0) {
          controller.enqueue(new TextEncoder().encode(
            sseEncode('actions', actionResults)
          ))
        }

        // Clean display text
        const displayText = fullText.replace(/```kira-action\n[\s\S]*?```/g, '').trim()

        // Save assistant message
        if (convId) {
          await supabase.from('chat_messages').insert({
            conversation_id: convId,
            user_id: user.id,
            role: 'assistant',
            content: displayText,
            actions_executed: actionResults.length > 0 ? actionResults : [],
          })
          await supabase
            .from('chat_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', convId)
        }

        // Send done event
        controller.enqueue(new TextEncoder().encode(
          sseEncode('done', {
            conversationId: convId,
            actions: actionResults,
            toolCalls: toolCalls.map(tc => ({ name: tc.name, id: tc.id })),
          })
        ))

        // Fire-and-forget: silent observation
        const origin = request.headers.get('origin') || request.headers.get('x-forwarded-host') || ''
        const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`
        fetch(`${baseUrl}/api/ai/observe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie: request.headers.get('cookie') || '' },
          body: JSON.stringify({
            messages: [...messages, { role: 'assistant', content: displayText }],
            conversationId: convId,
          }),
        }).catch(() => {})

        controller.close()
      } catch (err) {
        console.error('[KIRA AI] chat error:', err)
        controller.enqueue(new TextEncoder().encode(
          sseEncode('error', { message: err instanceof Error ? err.message : 'Chat failed' })
        ))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
