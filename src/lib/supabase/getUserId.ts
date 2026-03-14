import { createClient } from './client'

let cachedUserId: string | null = null

export async function getUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  cachedUserId = user?.id || null
  return cachedUserId
}
