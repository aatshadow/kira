/**
 * LinkedIn integration for KIRA
 * Uses LinkedIn API v2 with OAuth access token
 * Capabilities: profile, connections, posts, messaging (limited)
 */

const LI_API = 'https://api.linkedin.com/v2'

function getHeaders(): Record<string, string> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  if (!token) throw new Error('LINKEDIN_ACCESS_TOKEN no configurado')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  }
}

export interface LIProfile {
  id: string
  firstName: string
  lastName: string
  headline?: string
  profilePicture?: string
}

export interface LIPost {
  id: string
  text: string
  createdAt: string
  likes?: number
  comments?: number
}

export async function getLinkedInProfile(): Promise<{ profile: LIProfile | null; error?: string }> {
  try {
    const res = await fetch(`${LI_API}/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))`, {
      headers: getHeaders(),
    })
    if (!res.ok) {
      const err = await res.text()
      return { profile: null, error: `LinkedIn API error ${res.status}: ${err.slice(0, 200)}` }
    }
    const data = await res.json()
    return {
      profile: {
        id: data.id,
        firstName: data.firstName?.localized?.en_US || data.firstName?.localized?.[Object.keys(data.firstName?.localized || {})[0]] || '',
        lastName: data.lastName?.localized?.en_US || data.lastName?.localized?.[Object.keys(data.lastName?.localized || {})[0]] || '',
      },
    }
  } catch (err) {
    return { profile: null, error: err instanceof Error ? err.message : 'Error' }
  }
}

export async function createLinkedInPost(
  text: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // First get profile ID
    const { profile, error: profileError } = await getLinkedInProfile()
    if (!profile) return { success: false, error: profileError || 'No se pudo obtener perfil' }

    const res = await fetch(`${LI_API}/ugcPosts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        author: `urn:li:person:${profile.id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: `Error al publicar: ${err.slice(0, 200)}` }
    }

    const postId = res.headers.get('x-restli-id') || 'published'
    return { success: true, postId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error' }
  }
}

export async function getLinkedInNotifications(): Promise<{ notifications: string[]; error?: string }> {
  try {
    // LinkedIn doesn't have a direct notifications API for regular apps
    // But we can check profile views and post engagement
    const res = await fetch(`${LI_API}/me?projection=(id,firstName,lastName)`, {
      headers: getHeaders(),
    })
    if (!res.ok) return { notifications: [], error: `Error ${res.status}` }
    return { notifications: ['LinkedIn conectado. Las notificaciones detalladas requieren LinkedIn Marketing API.'] }
  } catch (err) {
    return { notifications: [], error: err instanceof Error ? err.message : 'Error' }
  }
}

export async function sendLinkedInMessage(
  recipientUrn: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { profile } = await getLinkedInProfile()
    if (!profile) return { success: false, error: 'No se pudo obtener perfil de LinkedIn' }

    const res = await fetch('https://api.linkedin.com/v2/messages', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        recipients: [recipientUrn],
        subject: 'Message from KIRA',
        body: message,
        messageType: 'MEMBER_TO_MEMBER',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      // LinkedIn messaging API is very restricted
      if (res.status === 403) {
        return { success: false, error: 'LinkedIn Messaging API requiere permisos especiales (w_member_social). Considera usar LinkedIn directamente para DMs.' }
      }
      return { success: false, error: `Error ${res.status}: ${err.slice(0, 200)}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error' }
  }
}

export async function checkLinkedInStatus(): Promise<{ connected: boolean; name?: string; error?: string }> {
  try {
    const { profile, error } = await getLinkedInProfile()
    if (!profile) return { connected: false, error }
    return { connected: true, name: `${profile.firstName} ${profile.lastName}` }
  } catch (err) {
    if (err instanceof Error && err.message.includes('LINKEDIN_ACCESS_TOKEN')) {
      return { connected: false, error: 'Access token no configurado' }
    }
    return { connected: false, error: err instanceof Error ? err.message : 'Error' }
  }
}
