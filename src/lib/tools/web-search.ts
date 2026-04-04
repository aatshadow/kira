import { getApiKey } from './keys'

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
}

export async function executeWebSearch(query: string, userId: string): Promise<{ results: WebSearchResult[]; error?: string }> {
  const apiKey = await getApiKey('brave_search', userId)
  if (!apiKey) {
    return { results: [], error: 'Brave Search API no configurada. Ve a Settings → Integraciones para añadir tu API key.' }
  }

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`,
      { headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' } }
    )

    if (!res.ok) {
      return { results: [], error: `Search API error: ${res.status}` }
    }

    const data = await res.json()
    const results: WebSearchResult[] = (data.web?.results || []).slice(0, 8).map(
      (r: { title: string; url: string; description: string }) => ({
        title: r.title,
        url: r.url,
        snippet: r.description,
      })
    )

    return { results }
  } catch (err) {
    return { results: [], error: err instanceof Error ? err.message : 'Search failed' }
  }
}
