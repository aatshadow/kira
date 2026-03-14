import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text, categories, projects, tags, today } = await request.json()

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  }

  const categoryList = (categories || []).map((c: { id: string; name: string }) => `- "${c.name}" (id: ${c.id})`).join('\n')
  const projectList = (projects || []).map((p: { id: string; name: string }) => `- "${p.name}" (id: ${p.id})`).join('\n')
  const tagList = (tags || []).map((t: { name: string }) => t.name).join(', ')

  const systemPrompt = `You are a task parser for KIRA, a productivity app for founders. Given natural language text (usually in Spanish), extract a structured task as JSON.

Today's date: ${today || new Date().toISOString().split('T')[0]}

Available categories:
${categoryList || '(none)'}

Available projects:
${projectList || '(none)'}

Existing tags: ${tagList || '(none)'}

Priority uses the Eisenhower matrix:
- q1: Urgente + Importante (crisis, deadlines)
- q2: Importante, No Urgente (strategy, planning, growth)
- q3: Urgente, No Importante (interruptions, small requests)
- q4: No Urgente, No Importante (low priority, nice to have)

Output ONLY valid JSON with this exact shape:
{
  "title": "string, concise action-oriented title, max 60 chars",
  "description": "string or null, extra details",
  "priority": "q1 | q2 | q3 | q4 | null",
  "category_id": "exact id from list or null",
  "project_id": "exact id from list or null",
  "estimated_mins": "number or null",
  "due_date": "YYYY-MM-DD or null",
  "status": "todo if due today/tomorrow, otherwise backlog",
  "tags": ["array", "of", "tag strings"]
}

Rules:
1. Title should be action-oriented and concise.
2. Match category and project by semantic similarity to the user's text. Use the EXACT id from the list. If no match, use null.
3. Infer priority from cues: "urgente", "crítico", "asap" → q1; "importante", "estratégico" → q2; "cuando puedas", "minor" → q4. Default null.
4. Parse relative dates: "mañana"/"manana" = tomorrow, "próxima semana" = next Monday, "viernes" = next Friday, etc.
5. Estimate duration if mentioned ("30 min", "media hora", "un par de horas" = 120).
6. Reuse existing tags when possible.
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

    // Validate IDs exist in provided lists
    const validCategoryIds = new Set((categories || []).map((c: { id: string }) => c.id))
    const validProjectIds = new Set((projects || []).map((p: { id: string }) => p.id))

    if (parsed.category_id && !validCategoryIds.has(parsed.category_id)) {
      parsed.category_id = null
    }
    if (parsed.project_id && !validProjectIds.has(parsed.project_id)) {
      parsed.project_id = null
    }

    const validPriorities = ['q1', 'q2', 'q3', 'q4']
    if (parsed.priority && !validPriorities.includes(parsed.priority)) {
      parsed.priority = null
    }

    return NextResponse.json(parsed)
  } catch (err: unknown) {
    console.error('[KIRA AI] text-to-task error:', err)
    const message = err instanceof Error ? err.message : 'Failed to parse task'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
