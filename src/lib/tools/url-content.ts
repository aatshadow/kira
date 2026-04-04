export async function executeGetUrlContent(url: string): Promise<{ content: string; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'KIRA/1.0 (Personal Assistant)' },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      return { content: '', error: `HTTP ${res.status}` }
    }

    const contentType = res.headers.get('content-type') || ''

    // JSON response
    if (contentType.includes('application/json')) {
      const json = await res.json()
      return { content: JSON.stringify(json, null, 2).slice(0, 8000) }
    }

    const html = await res.text()

    // Plain text
    if (!contentType.includes('text/html')) {
      return { content: html.slice(0, 8000) }
    }

    // Extract text from HTML — simple tag stripping
    const text = html
      // Remove script/style blocks
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      // Remove tags
      .replace(/<[^>]+>/g, '\n')
      // Decode entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      // Collapse whitespace
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim()

    return { content: text.slice(0, 8000) }
  } catch (err) {
    return { content: '', error: err instanceof Error ? err.message : 'Fetch failed' }
  }
}
