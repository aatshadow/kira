/**
 * ManyChat integration for KIRA
 * Manages Instagram/Facebook DM conversations via ManyChat API
 * API docs: https://api.manychat.com
 */

const MC_API = 'https://api.manychat.com/fb'

function getHeaders(): Record<string, string> {
  const key = process.env.MANYCHAT_API_KEY
  if (!key) throw new Error('MANYCHAT_API_KEY no configurada')
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

export interface MCSubscriber {
  id: string
  name: string
  first_name: string
  last_name: string
  profile_pic?: string
  gender?: string
  locale?: string
  last_interaction?: string
  subscribed?: string
  custom_fields?: Record<string, unknown>
}

export async function getManyChatPageInfo(): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    const res = await fetch(`${MC_API}/page/getInfo`, { headers: getHeaders() })
    if (!res.ok) return { success: false, error: `ManyChat API error ${res.status}` }
    const data = await res.json()
    return { success: true, data: data.data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error' }
  }
}

export async function searchSubscribers(
  name: string
): Promise<{ subscribers: MCSubscriber[]; error?: string }> {
  try {
    const res = await fetch(`${MC_API}/subscriber/findByName`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { subscribers: [], error: `ManyChat error ${res.status}: ${err.slice(0, 200)}` }
    }
    const data = await res.json()
    return { subscribers: data.data || [] }
  } catch (err) {
    return { subscribers: [], error: err instanceof Error ? err.message : 'Error' }
  }
}

export async function getSubscriberInfo(
  subscriberId: string
): Promise<{ subscriber: MCSubscriber | null; error?: string }> {
  try {
    const res = await fetch(`${MC_API}/subscriber/getInfo?subscriber_id=${subscriberId}`, {
      headers: getHeaders(),
    })
    if (!res.ok) return { subscriber: null, error: `Error ${res.status}` }
    const data = await res.json()
    return { subscriber: data.data }
  } catch (err) {
    return { subscriber: null, error: err instanceof Error ? err.message : 'Error' }
  }
}

export async function sendManyChatMessage(
  subscriberId: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${MC_API}/sending/sendContent`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        subscriber_id: subscriberId,
        data: {
          version: 'v2',
          content: {
            messages: [
              { type: 'text', text },
            ],
          },
        },
        message_tag: 'ACCOUNT_UPDATE',
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: `ManyChat error ${res.status}: ${err.slice(0, 200)}` }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error' }
  }
}

export async function getManyChatSubscribers(
  limit: number = 20
): Promise<{ subscribers: MCSubscriber[]; error?: string }> {
  try {
    // Use getGrowthTools or search with empty to get recent
    const res = await fetch(`${MC_API}/subscriber/getInfo?subscriber_id=0`, {
      headers: getHeaders(),
    })
    // Fallback: search with common patterns
    if (!res.ok) {
      // Try getting page info to verify connection
      const pageRes = await fetch(`${MC_API}/page/getInfo`, { headers: getHeaders() })
      if (!pageRes.ok) return { subscribers: [], error: `ManyChat no conectado: ${pageRes.status}` }
      return { subscribers: [], error: 'Usa manychat_search para buscar suscriptores por nombre' }
    }
    const data = await res.json()
    return { subscribers: data.data ? [data.data] : [] }
  } catch (err) {
    return { subscribers: [], error: err instanceof Error ? err.message : 'Error' }
  }
}

export async function checkManyChatStatus(): Promise<{ connected: boolean; pageName?: string; error?: string }> {
  try {
    const res = await fetch(`${MC_API}/page/getInfo`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { connected: false, error: `Error ${res.status}` }
    const data = await res.json()
    return { connected: true, pageName: data.data?.name }
  } catch (err) {
    if (err instanceof Error && err.message.includes('MANYCHAT_API_KEY')) {
      return { connected: false, error: 'API key no configurada' }
    }
    return { connected: false, error: err instanceof Error ? err.message : 'Error' }
  }
}
