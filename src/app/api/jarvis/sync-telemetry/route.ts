import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { error } = await supabase.from('jarvis_telemetry').insert({
    user_id: user.id,
    model_id: body.model_id || '',
    engine: body.engine || '',
    agent: body.agent || '',
    prompt_tokens: body.prompt_tokens || 0,
    completion_tokens: body.completion_tokens || 0,
    total_tokens: body.total_tokens || 0,
    latency_seconds: body.latency_seconds || 0,
    ttft: body.ttft || 0,
    tokens_per_sec: body.tokens_per_sec || 0,
    metadata: body.metadata || {},
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
