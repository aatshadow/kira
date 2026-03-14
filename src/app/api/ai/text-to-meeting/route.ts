import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text, today } = await request.json()

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  }

  const systemPrompt = `You are a meeting parser for KIRA, a productivity app for founders. Given natural language text (usually in Spanish), extract a structured meeting as JSON.

Today's date and time: ${today || new Date().toISOString()}

Output ONLY valid JSON with this exact shape:
{
  "title": "string, concise meeting title, max 60 chars",
  "scheduled_at": "ISO 8601 datetime string or null",
  "duration_mins": "number or null",
  "participants": "string, comma-separated names or null",
  "pre_notes": "string, agenda or talking points or null"
}

Rules:
1. Title should be concise and descriptive.
2. Parse relative dates and times: "mañana a las 10" = tomorrow at 10:00, "el viernes" = next Friday, "en una hora" = 1 hour from now, "a las 3 de la tarde" = 15:00.
3. If no time specified but date is given, default to 10:00.
4. Parse duration: "una hora" = 60, "media hora" = 30, "45 minutos" = 45. Default null if not mentioned.
5. Extract participant names if mentioned.
6. Any extra context or agenda items go into pre_notes.
7. No markdown, no explanation — ONLY the JSON object.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: text.trim() }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
    }

    const parsed = JSON.parse(content.text)

    const validParsed = {
      title: typeof parsed.title === 'string' ? parsed.title : null,
      scheduled_at: typeof parsed.scheduled_at === 'string' ? parsed.scheduled_at : null,
      duration_mins: typeof parsed.duration_mins === 'number' ? parsed.duration_mins : null,
      participants: typeof parsed.participants === 'string' ? parsed.participants : null,
      pre_notes: typeof parsed.pre_notes === 'string' ? parsed.pre_notes : null,
    }

    return NextResponse.json(validParsed)
  } catch (err: unknown) {
    console.error('[KIRA AI] text-to-meeting error:', err)
    const message = err instanceof Error ? err.message : 'Failed to parse meeting'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
