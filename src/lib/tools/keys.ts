import { createClient } from '@/lib/supabase/server'

/**
 * Get an API key for a service — checks env var first, then Supabase user_api_keys table.
 */
export async function getApiKey(service: string, userId: string): Promise<string | null> {
  // Priority 1: Environment variable
  const envMap: Record<string, string> = {
    brave_search: 'BRAVE_API_KEY',
    e2b: 'E2B_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    mac_daemon: 'MAC_DAEMON_SECRET',
  }

  const envKey = envMap[service]
  if (envKey && process.env[envKey]) {
    return process.env[envKey]!
  }

  // Priority 2: Supabase user_api_keys
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('user_api_keys')
      .select('api_key')
      .eq('user_id', userId)
      .eq('service', service)
      .eq('is_valid', true)
      .single()

    return data?.api_key || null
  } catch {
    return null
  }
}
