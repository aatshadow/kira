import { NextRequest } from 'next/server'
import { JARVIS_BASE } from '@/lib/jarvis/proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    const jarvisRes = await fetch(`${JARVIS_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        stream: true,
      }),
    })

    if (!jarvisRes.ok) {
      const errorText = await jarvisRes.text().catch(() => 'Unknown error')
      return new Response(
        JSON.stringify({ error: `Jarvis error ${jarvisRes.status}: ${errorText}` }),
        { status: jarvisRes.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Proxy the SSE stream directly
    const stream = new ReadableStream({
      async start(controller) {
        const reader = jarvisRes.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
        } catch (err) {
          console.error('[KIRA] Jarvis stream error:', err)
        } finally {
          controller.close()
          reader.releaseLock()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    // Jarvis is not running
    return new Response(
      JSON.stringify({
        error: 'OpenJarvis no está disponible. Asegúrate de que el servidor está corriendo en ' + JARVIS_BASE,
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
