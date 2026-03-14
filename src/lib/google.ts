import { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * Get a valid Google access token, refreshing if needed.
 * Priority: session.provider_token → stored token (validated) → refresh via refresh_token
 */
export async function getValidGoogleToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  // 1. Try session provider_token (available right after login)
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.provider_token) {
    // Validate it's still good
    const valid = await validateGoogleToken(session.provider_token)
    if (valid) {
      // Also update stored token
      await supabase.from('profiles').update({
        google_access_token: session.provider_token,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
      return session.provider_token
    }
  }

  // 2. Try stored access token
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token')
    .eq('id', userId)
    .single()

  if (profile?.google_access_token) {
    const valid = await validateGoogleToken(profile.google_access_token)
    if (valid) return profile.google_access_token
  }

  // 3. Refresh using refresh_token
  if (profile?.google_refresh_token) {
    const newToken = await refreshGoogleToken(profile.google_refresh_token)
    if (newToken) {
      // Store the new token
      await supabase.from('profiles').update({
        google_access_token: newToken,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
      return newToken
    }
  }

  return null
}

async function validateGoogleToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`
    )
    return res.ok
  } catch {
    return false
  }
}

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('[KIRA] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars for token refresh')
    return null
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('[KIRA] Google token refresh failed:', err)
      return null
    }

    const data = await res.json()
    return data.access_token || null
  } catch (err) {
    console.error('[KIRA] Google token refresh error:', err)
    return null
  }
}
