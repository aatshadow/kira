import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/agents/activity
 * Returns recent agent activity for the real-time dashboard.
 * Combines agent_logs + kira_notifications + kira_task_queue status.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')
  const since = req.nextUrl.searchParams.get('since') // ISO timestamp

  // Fetch all in parallel
  const [logsRes, notifsRes, tasksRes] = await Promise.all([
    // Recent agent logs
    (() => {
      let q = supabase
        .from('agent_logs')
        .select('id, agent_id, action, status, input, output, error, duration_ms, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (since) q = q.gte('created_at', since)
      return q
    })(),

    // Recent notifications from agents
    supabase
      .from('kira_notifications')
      .select('id, type, title, body, data, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),

    // Task queue status
    supabase
      .from('kira_task_queue')
      .select('id, type, payload, status, target, result, error, created_at, started_at, completed_at')
      .eq('user_id', user.id)
      .in('status', ['pending', 'assigned', 'running'])
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // Aggregate stats
  const logs = logsRes.data || []
  const successCount = logs.filter(l => l.status === 'success').length
  const errorCount = logs.filter(l => l.status === 'error').length
  const pendingCount = logs.filter(l => l.status === 'pending').length

  // Group logs by agent name (extracted from action field "AgentName:action_type")
  const agentActivity: Record<string, { actions: number; lastAction: string; lastTime: string; status: string }> = {}
  for (const log of logs) {
    const agentName = log.action?.split(':')[0] || 'Unknown'
    if (!agentActivity[agentName]) {
      agentActivity[agentName] = {
        actions: 0,
        lastAction: log.action?.split(':')[1] || log.action,
        lastTime: log.created_at,
        status: log.status,
      }
    }
    agentActivity[agentName].actions++
  }

  return NextResponse.json({
    logs,
    notifications: notifsRes.data || [],
    runningTasks: tasksRes.data || [],
    stats: {
      total: logs.length,
      success: successCount,
      errors: errorCount,
      pending: pendingCount,
    },
    agentActivity,
  })
}

/**
 * POST /api/agents/activity/trigger
 * Manually trigger the autonomous loop for the current user
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { runAutonomousLoop } = await import('@/lib/agents/autonomous-loop')
    const result = await runAutonomousLoop(supabase, user.id)
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
