import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId } = await request.json()
  if (!meetingId) return NextResponse.json({ error: 'meetingId required' }, { status: 400 })

  // Fetch meeting with transcript
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single()

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  if (!meeting.transcript) return NextResponse.json({ error: 'No transcript available' }, { status: 400 })

  // Fetch user's categories and projects for task assignment
  const [{ data: categories }, { data: projects }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('user_id', user.id),
    supabase.from('projects').select('id, name').eq('user_id', user.id).eq('is_archived', false),
  ])

  const categoryList = (categories || []).map(c => `${c.name} (${c.id})`).join(', ')
  const projectList = (projects || []).map(p => `${p.name} (${p.id})`).join(', ')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `Eres KIRA, asistente de productividad. Analiza transcripciones de reuniones y genera resúmenes + acciones.

Responde SIEMPRE en JSON con esta estructura exacta:
{
  "summary": "Resumen ejecutivo de 3-5 párrafos en español. Incluye: temas tratados, decisiones tomadas, y conclusiones clave.",
  "action_items": [
    {
      "title": "Titulo conciso de la acción",
      "description": "Descripción detallada de qué hay que hacer",
      "priority": "q1|q2|q3|q4",
      "category_id": "UUID de la categoría más adecuada o null",
      "project_id": "UUID del proyecto más adecuado o null",
      "estimated_mins": número estimado de minutos
    }
  ]
}

Categorías disponibles: ${categoryList || 'ninguna'}
Proyectos disponibles: ${projectList || 'ninguno'}

Prioridades (Matriz de Eisenhower):
- q1: Urgente + Importante
- q2: Importante, no urgente
- q3: Urgente, no importante
- q4: Ni urgente ni importante

Reglas:
- El resumen debe ser en español, profesional pero directo
- Extrae TODAS las acciones mencionadas, incluso las implícitas
- Asigna categoría/proyecto solo si hay una coincidencia clara, si no pon null
- Estima duración realista en minutos`,
      messages: [
        {
          role: 'user',
          content: `Reunión: "${meeting.title}"
Fecha: ${meeting.scheduled_at || 'No especificada'}
Participantes: ${meeting.participants || 'No especificados'}
Notas previas: ${meeting.pre_notes || 'Ninguna'}

--- TRANSCRIPCIÓN ---
${meeting.transcript.slice(0, 80_000)}
--- FIN TRANSCRIPCIÓN ---

Genera el resumen y las acciones.`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected AI response' }, { status: 500 })
    }

    // Parse JSON from Claude response
    let parsed: { summary: string; action_items: Array<{
      title: string; description: string; priority: string;
      category_id: string | null; project_id: string | null;
      estimated_mins: number;
    }> }

    try {
      // Try to extract JSON from the response (Claude sometimes wraps in markdown)
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content.text)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Save summary to meeting
    await supabase
      .from('meetings')
      .update({
        ai_summary: parsed.summary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId)

    // Create tasks from action items
    const taskIds: string[] = []
    for (const item of parsed.action_items) {
      const priority = ['q1', 'q2', 'q3', 'q4'].includes(item.priority) ? item.priority : 'q2'

      const { data: task } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: item.title,
          description: item.description,
          priority,
          category_id: item.category_id || null,
          project_id: item.project_id || null,
          estimated_mins: item.estimated_mins || null,
          meeting_id: meetingId,
          status: 'todo',
          tags: ['meeting-action-item'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (task) taskIds.push(task.id)
    }

    return NextResponse.json({
      summary: parsed.summary,
      tasks_created: taskIds.length,
      task_ids: taskIds,
    })
  } catch (err) {
    console.error('[KIRA] Meeting digest error:', err)
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 })
  }
}
