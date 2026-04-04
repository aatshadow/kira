import { NextRequest } from 'next/server'

/**
 * POST /api/ai/tts
 * Converts text to speech using ElevenLabs API.
 * Returns audio/mpeg stream.
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { text, voice_id } = await request.json()
  if (!text) {
    return new Response(JSON.stringify({ error: 'text required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Strip markdown for cleaner speech
  const clean = text
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/#{1,6}\s/g, '') // headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/[`~_|]/g, '') // misc markdown
    .replace(/\n{2,}/g, '. ') // double newlines to pauses
    .trim()

  if (!clean) {
    return new Response(JSON.stringify({ error: 'No speakable text' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Truncate to save quota (ElevenLabs charges per character)
  const truncated = clean.slice(0, 2000)

  try {
    // Default: Veda Sky — natural, mindful, caring. Conversational female.
    // Alternatives: Lily (pFZP5JQG7iQjIQuC4Bku) velvety/calm
    const selectedVoice = voice_id || 'XcXEQzuLXRU9RcfWzEJt' // Veda Sky

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: truncated,
          model_id: 'eleven_multilingual_v2', // Supports Spanish
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.15,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: `ElevenLabs error: ${err}` }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Stream the audio back
    return new Response(res.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'TTS failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
