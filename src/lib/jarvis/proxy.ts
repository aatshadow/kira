export const JARVIS_BASE = process.env.JARVIS_API_URL || 'http://127.0.0.1:8000'

export async function jarvisProxy(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${JARVIS_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
}
