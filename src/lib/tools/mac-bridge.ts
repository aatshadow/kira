import { createClient } from '@/lib/supabase/server'

export async function checkMacStatus(userId: string): Promise<{ online: boolean; capabilities?: Record<string, unknown> }> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('kira_mac_sessions')
    .select('last_heartbeat, capabilities')
    .eq('user_id', userId)
    .order('last_heartbeat', { ascending: false })
    .limit(1)
    .single()

  if (!data) return { online: false }

  const lastBeat = new Date(data.last_heartbeat).getTime()
  const isOnline = Date.now() - lastBeat < 60_000 // 60s threshold

  return { online: isOnline, capabilities: isOnline ? data.capabilities : undefined }
}

export async function delegateToMac(
  userId: string,
  task: { type: string; description: string; payload: Record<string, unknown> }
): Promise<{ taskId: string; queued: boolean; mac_online: boolean }> {
  const supabase = await createClient()
  const { online } = await checkMacStatus(userId)

  const { data, error } = await supabase
    .from('kira_task_queue')
    .insert({
      user_id: userId,
      type: task.type,
      payload: { description: task.description, ...task.payload },
      status: 'pending',
      target: 'mac',
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to queue task: ${error.message}`)
  }

  return {
    taskId: data.id,
    queued: true,
    mac_online: online,
  }
}
