import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * POST /api/ai/observe
 *
 * Silent post-conversation observer. Analyzes the user's messages
 * and extracts observations about personality, preferences, patterns,
 * emotions, and context — then saves them as persistent memories.
 *
 * Called fire-and-forget after each chat exchange.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages, conversationId } = await request.json() as {
    messages: Array<{ role: string; content: string }>
    conversationId: string | null
  }

  if (!messages || messages.length < 2) {
    return NextResponse.json({ ok: true }) // not enough to analyze
  }

  // Load existing memories to avoid duplicates
  const { data: existingMemories } = await supabase
    .from('kira_memory')
    .select('content')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(30)

  const existingMemoryText = existingMemories
    ? existingMemories.map(m => m.content).join('\n')
    : ''

  // Only analyze the last 6 messages (3 exchanges max) to keep it focused
  const recentMessages = messages.slice(-6)
  const conversationText = recentMessages
    .map(m => `${m.role === 'user' ? 'USUARIO' : 'KIRA'}: ${m.content}`)
    .join('\n\n')

  const prompt = `Analiza esta conversacion entre un usuario y KIRA (su asistente AI de productividad). Tu trabajo es extraer observaciones sobre el usuario que sean utiles para conocerle mejor a largo plazo.

## Conversacion reciente
${conversationText}

## Memorias existentes (para NO duplicar)
${existingMemoryText || '(ninguna)'}

## Instrucciones

Extrae observaciones sobre el usuario. Busca:
- **Preferencias** de trabajo, horarios, herramientas, metodos
- **Estado emocional** — estresado, motivado, cansado, entusiasmado
- **Prioridades** — que le importa ahora, que le preocupa
- **Relaciones** — personas mencionadas, roles, dinamicas
- **Patrones** — como se comunica, que pide, como toma decisiones
- **Contexto personal** — proyectos, objetivos, situaciones de vida
- **Estilo de comunicacion** — formal/informal, directo/detallado, impaciente/reflexivo

REGLAS:
1. Solo extrae observaciones NUEVAS que no esten ya en las memorias existentes
2. Si no hay nada nuevo o interesante, responde con un array vacio []
3. Se especifico: "prefiere meetings por la manana" es mejor que "tiene preferencias de horario"
4. Cada observacion debe ser una frase corta y clara
5. Maximo 3 observaciones por conversacion (calidad sobre cantidad)
6. No observes cosas triviales — solo lo que ayude a conocer al usuario

Responde SOLO con un JSON array:
[
  { "category": "preference|personal|work|emotional|relationship|pattern", "content": "observacion concreta" }
]

Si no hay nada nuevo, responde: []`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ ok: true })
    }

    let observations: Array<{ category: string; content: string }>
    try {
      const jsonText = content.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      observations = JSON.parse(jsonText)
    } catch {
      return NextResponse.json({ ok: true }) // malformed, skip
    }

    if (!Array.isArray(observations) || observations.length === 0) {
      return NextResponse.json({ ok: true, observations: 0 })
    }

    // Save each observation as a memory
    const inserts = observations.slice(0, 3).map(obs => ({
      user_id: user.id,
      category: obs.category || 'pattern',
      content: obs.content,
      source_conversation_id: conversationId || null,
    }))

    await supabase.from('kira_memory').insert(inserts)

    return NextResponse.json({ ok: true, observations: inserts.length })
  } catch (err) {
    console.error('[KIRA] Observe error:', err)
    return NextResponse.json({ ok: true }) // fail silently
  }
}
