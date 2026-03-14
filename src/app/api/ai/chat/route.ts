import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages, context, conversationId } = await request.json() as {
    messages: ChatMessage[]
    conversationId: string | null
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
    return NextResponse.json({ error: 'Messages required' }, { status: 400 })
  }

  // --- Conversation persistence ---
  let convId = conversationId

  // Create new conversation if needed
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

  // Save the user message (last one in array)
  const lastUserMsg = messages[messages.length - 1]
  if (convId && lastUserMsg?.role === 'user') {
    await supabase.from('chat_messages').insert({
      conversation_id: convId,
      user_id: user.id,
      role: 'user',
      content: lastUserMsg.content,
    })
  }

  // --- Load Google Calendar events ---
  let calendarEventsText = '(Google Calendar no conectado)'
  const { data: { session } } = await supabase.auth.getSession()
  const googleToken = session?.provider_token || null

  if (googleToken) {
    try {
      const now = new Date()
      const timeMin = now.toISOString()
      const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&` +
        `maxResults=20&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${googleToken}` } }
      )
      if (calRes.ok) {
        const calData = await calRes.json()
        const events = (calData.items || []).map((e: Record<string, unknown>) => {
          const start = (e.start as Record<string, string>)?.dateTime || (e.start as Record<string, string>)?.date || ''
          const end = (e.end as Record<string, string>)?.dateTime || (e.end as Record<string, string>)?.date || ''
          const attendees = ((e.attendees as Array<Record<string, string>>) || []).map(a => `${a.email}(${a.responseStatus || '?'})`).join(', ')
          const meetLink = (e.hangoutLink as string) || ''
          const location = (e.location as string) || ''
          const desc = (e.description as string) || ''
          const parts = [`"${e.summary}"`, `Start:${start}`]
          if (end) parts.push(`End:${end}`)
          if (attendees) parts.push(`With:${attendees}`)
          if (meetLink) parts.push(`Meet:${meetLink}`)
          if (location) parts.push(`Location:${location}`)
          if (desc) parts.push(`Desc:${desc.slice(0, 100)}`)
          return `  - ${parts.join(' | ')} [gcal_id:${e.id}]`
        }).join('\n')
        calendarEventsText = events || '(no upcoming events)'
      }
    } catch {
      // ignore calendar fetch errors
    }
  }

  // --- Load KIRA memories ---
  const { data: memories } = await supabase
    .from('kira_memory')
    .select('category, content')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  const memoryText = memories && memories.length > 0
    ? memories.map(m => `[${m.category}] ${m.content}`).join('\n')
    : '(no memories yet)'

  // --- Build context ---
  const tasksByStatus: Record<string, typeof context.tasks> = {}
  for (const t of context.tasks) {
    const s = t.status
    if (!tasksByStatus[s]) tasksByStatus[s] = []
    tasksByStatus[s].push(t)
  }

  const taskSummary = Object.entries(tasksByStatus)
    .map(([status, tasks]) => {
      const lines = tasks.map(t => {
        const parts = [`"${t.title}"`]
        if (t.priority) parts.push(`P:${t.priority}`)
        if (t.category) parts.push(`Cat:${t.category}`)
        if (t.project) parts.push(`Proj:${t.project}`)
        if (t.due_date) parts.push(`Due:${t.due_date}`)
        if (t.estimated_mins) parts.push(`${t.estimated_mins}min`)
        if (t.tags.length) parts.push(`Tags:${t.tags.join(',')}`)
        return `  - ${parts.join(' | ')} [id:${t.id}]`
      }).join('\n')
      return `${status.toUpperCase()} (${tasks.length}):\n${lines}`
    }).join('\n\n')

  const upcomingMeetings = context.meetings
    .filter(m => m.status === 'scheduled' || m.status === 'in_progress')
    .map(m => {
      const parts = [`"${m.title}"`]
      if (m.scheduled_at) parts.push(`At:${m.scheduled_at}`)
      if (m.duration_mins) parts.push(`${m.duration_mins}min`)
      if (m.participants) parts.push(`With:${m.participants}`)
      return `  - ${parts.join(' | ')} [id:${m.id}]`
    }).join('\n')

  const categoryList = context.categories.map(c => `"${c.name}" (id:${c.id})`).join(', ')
  const projectList = context.projects.map(p => `"${p.name}" (id:${p.id})`).join(', ')
  const tagList = context.tags.map(t => t.name).join(', ')

  const systemPrompt = `You are KIRA, an intelligent AI assistant embedded in a productivity app for founders and entrepreneurs. You communicate in Spanish (the user's language) with a direct, efficient, warm tone. You're the user's personal assistant — you know them and remember things about them.

Today: ${context.today}
Current time: ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}

## Your Memory (things you remember about the user)
${memoryText}

## User's Current Data

### Tasks
${taskSummary || '(no tasks)'}

### Upcoming Meetings
${upcomingMeetings || '(no upcoming meetings)'}

### Google Calendar (next 7 days)
${calendarEventsText}

### Available Categories: ${categoryList || '(none)'}
### Available Projects: ${projectList || '(none)'}
### Existing Tags: ${tagList || '(none)'}

## Your Capabilities

You can execute actions by including JSON action blocks in your response:

\`\`\`kira-action
{
  "action": "create_task" | "edit_task" | "delete_task" | "create_meeting" | "edit_meeting" | "delete_meeting" | "save_memory" | "delete_memory" | "create_calendar_event" | "update_calendar_event" | "delete_calendar_event",
  "data": { ... }
}
\`\`\`

### Action Schemas:

**create_task:**
{ "title": "string", "description": "string|null", "priority": "q1|q2|q3|q4|null", "category_id": "id|null", "project_id": "id|null", "status": "backlog|todo", "estimated_mins": "number|null", "due_date": "YYYY-MM-DD|null", "tags": ["string"], "notes": "string|null" }

**edit_task:**
{ "id": "task_id", ...fields to update }

**delete_task:**
{ "id": "task_id" }

**create_meeting:**
{ "title": "string", "scheduled_at": "ISO datetime|null", "duration_mins": "number|null", "participants": "string|null", "pre_notes": "string|null" }

**edit_meeting:**
{ "id": "meeting_id", ...fields to update }

**delete_meeting:**
{ "id": "meeting_id" }

**save_memory** (save something to remember about the user):
{ "category": "preference|habit|personal|work|important", "content": "what to remember" }

**delete_memory** (forget something):
{ "content_match": "partial text to match and delete" }

**create_calendar_event** (create event in Google Calendar):
{ "title": "string", "start": "ISO datetime", "end": "ISO datetime|null", "description": "string|null", "attendees": "comma-separated emails|null", "add_meet": "boolean (true to auto-create Google Meet link)", "location": "string|null" }

**update_calendar_event** (update an existing Google Calendar event — use gcal_id from the events list):
{ "event_id": "gcal_id", "title": "string|null", "start": "ISO datetime|null", "end": "ISO datetime|null", "description": "string|null", "add_attendees": "comma-separated emails to ADD|null", "remove_attendees": "comma-separated emails to REMOVE|null", "add_meet": "boolean (true to add Google Meet link if not present)", "location": "string|null" }

**delete_calendar_event** (delete/cancel a Google Calendar event):
{ "event_id": "gcal_id", "send_notifications": "boolean (true to notify attendees, default true)" }

## Priority Matrix (Eisenhower):
- q1: Urgente + Importante
- q2: Importante, No Urgente
- q3: Urgente, No Importante
- q4: No Urgente, No Importante

## Rules:
1. Always respond in Spanish.
2. When creating tasks/meetings, infer as much as possible from context (priority, category, dates, duration).
3. Use EXACT ids from the provided lists for category_id and project_id.
4. You can include multiple action blocks in one response.
5. Parse relative dates: "mañana" = tomorrow, "el viernes" = next Friday, etc.
6. After executing an action, confirm what you did briefly.
7. You can answer questions about the user's tasks, schedule, productivity, etc.
8. Be proactive — if the user says something vague, suggest the best interpretation.
9. Keep responses concise but warm. You're a personal assistant, not a robot.
10. When the user tells you personal preferences, habits, or asks you to remember something, use the save_memory action.
11. When the user greets you (buenos días, hola, etc.), give a brief, warm greeting with a quick summary of their day: pending tasks for today, upcoming meetings, and any urgent items. Use your memory to personalize.
12. You can reference your memories naturally in conversation — "como me dijiste..." or "recuerdo que prefieres..."
13. Never show raw IDs to the user. Use names instead.
14. For Google Calendar: you can create, update, and delete events. You can add/remove attendees, add Google Meet video calls, change times, descriptions, and locations. Use the gcal_id shown in the calendar events list to reference existing events.
15. When the user asks to add a Meet link or video call to an event, use add_meet: true.
16. When analyzing the calendar, provide insights about schedule density, conflicts, free slots, and meeting patterns.`

  try {
    const anthropicMessages = messages.map((m: ChatMessage) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: anthropicMessages,
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
    }

    // Extract actions from response
    const actions: Array<{ action: string; data: Record<string, unknown> }> = []
    const actionRegex = /```kira-action\n([\s\S]*?)```/g
    let match
    while ((match = actionRegex.exec(content.text)) !== null) {
      try {
        actions.push(JSON.parse(match[1]))
      } catch {
        // skip malformed actions
      }
    }

    // Execute actions
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
              // First GET the existing event
              const getRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
                headers: { Authorization: `Bearer ${googleToken}` },
              })
              if (!getRes.ok) {
                const getErr = await getRes.json()
                actionResults.push({ action: 'update_calendar_event', success: false, error: getErr.error?.message || 'Event not found' })
                break
              }
              const existing = await getRes.json()

              // Build patch
              if (upData.title) existing.summary = upData.title
              if (upData.start) existing.start = { dateTime: upData.start, timeZone: 'Europe/Madrid' }
              if (upData.end) existing.end = { dateTime: upData.end, timeZone: 'Europe/Madrid' }
              if (upData.description !== undefined) existing.description = upData.description || ''
              if (upData.location !== undefined) existing.location = upData.location || ''

              // Handle attendees
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

              // Add Meet link
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
              // DELETE returns 204 No Content on success
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
        }
      } catch (err) {
        actionResults.push({ action: act.action, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // Clean the response text (remove action blocks for display)
    const displayText = content.text.replace(/```kira-action\n[\s\S]*?```/g, '').trim()

    // Save assistant message to DB
    if (convId) {
      await supabase.from('chat_messages').insert({
        conversation_id: convId,
        user_id: user.id,
        role: 'assistant',
        content: displayText,
        actions_executed: actionResults.length > 0 ? actionResults : [],
      })

      // Update conversation title and updated_at
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId)
    }

    return NextResponse.json({
      message: displayText,
      actions: actionResults,
      conversationId: convId,
    })
  } catch (err: unknown) {
    console.error('[KIRA AI] chat error:', err)
    const errMessage = err instanceof Error ? err.message : 'Chat failed'
    return NextResponse.json({ error: errMessage }, { status: 500 })
  }
}
