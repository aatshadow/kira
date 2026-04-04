import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runAutonomousLoop } from '@/lib/agents/autonomous-loop'

/**
 * GET /api/cron/agent-loop
 * Runs every 15 minutes via Vercel Cron.
 * Executes KIRA's autonomous loop for all active users.
 */
export async function GET(request: NextRequest) {
  // Verify cron auth (Vercel sets this header automatically)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Get all active users (users who have logged in recently)
  const { data: profiles } = await supabase
    .from('user_profile_ai')
    .select('user_id')

  if (!profiles?.length) {
    return NextResponse.json({ message: 'No active users', ran: 0 })
  }

  const results: Array<{ userId: string; actions: number; summary: string; error?: string }> = []

  for (const profile of profiles) {
    try {
      const result = await runAutonomousLoop(supabase, profile.user_id)
      results.push({
        userId: profile.user_id,
        actions: result.actions.length,
        summary: result.summary,
      })
    } catch (err) {
      results.push({
        userId: profile.user_id,
        actions: 0,
        summary: 'Error',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  const totalActions = results.reduce((sum, r) => sum + r.actions, 0)

  return NextResponse.json({
    ok: true,
    users: results.length,
    totalActions,
    results,
  })
}

// Also allow POST for manual trigger from the dashboard
export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // For manual trigger, get userId from body
  const { userId } = await request.json().catch(() => ({ userId: null }))
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const result = await runAutonomousLoop(supabase, userId)
    return NextResponse.json({
      ok: true,
      actions: result.actions,
      summary: result.summary,
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Loop failed',
    }, { status: 500 })
  }
}
