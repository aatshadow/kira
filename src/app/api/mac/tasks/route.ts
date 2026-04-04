import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// GET — Mac daemon polls for pending tasks
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-mac-secret')
  if (secret !== process.env.MAC_DAEMON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = request.nextUrl.searchParams.get('user_id')
  const macId = request.nextUrl.searchParams.get('mac_id')
  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  const { data: tasks } = await supabase
    .from('kira_task_queue')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'assigned'])
    .or(`target.eq.mac,target.eq.auto`)
    .order('created_at', { ascending: true })
    .limit(5)

  // Assign pending tasks to this Mac
  if (tasks && tasks.length > 0 && macId) {
    const pendingIds = tasks.filter(t => t.status === 'pending').map(t => t.id)
    if (pendingIds.length > 0) {
      await supabase
        .from('kira_task_queue')
        .update({ status: 'assigned', assigned_to: macId })
        .in('id', pendingIds)
    }
  }

  return NextResponse.json({ tasks: tasks || [] })
}

// POST — Submit a new task to the queue
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-mac-secret')
  if (secret !== process.env.MAC_DAEMON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user_id, type, payload, target } = await request.json()
  if (!user_id || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('kira_task_queue')
    .insert({
      user_id,
      type,
      payload: payload || {},
      target: target || 'mac',
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ taskId: data.id })
}

// PATCH — Mac updates task status with result
export async function PATCH(request: NextRequest) {
  const secret = request.headers.get('x-mac-secret')
  if (secret !== process.env.MAC_DAEMON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { task_id, status, result, error: taskError } = await request.json()
  if (!task_id || !status) {
    return NextResponse.json({ error: 'Missing task_id or status' }, { status: 400 })
  }

  const update: Record<string, unknown> = { status }

  if (status === 'running') {
    update.started_at = new Date().toISOString()
  } else if (status === 'completed' || status === 'failed') {
    update.completed_at = new Date().toISOString()
    if (result) update.result = result
    if (taskError) update.error = taskError
  }

  const { error } = await supabase
    .from('kira_task_queue')
    .update(update)
    .eq('id', task_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If completed, create notification
  if (status === 'completed') {
    const { data: task } = await supabase
      .from('kira_task_queue')
      .select('user_id, payload')
      .eq('id', task_id)
      .single()

    if (task) {
      await supabase.from('kira_notifications').insert({
        user_id: task.user_id,
        type: 'mac_task_done',
        title: 'Tarea completada en tu Mac',
        body: (task.payload as Record<string, string>)?.description || 'Task finished',
        data: { task_id, result },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
