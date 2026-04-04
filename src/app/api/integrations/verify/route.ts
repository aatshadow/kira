import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidGoogleToken } from '@/lib/google'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { service } = await request.json()
  if (!service) return NextResponse.json({ error: 'Service required' }, { status: 400 })

  const result = await verifyConnection(service, user.id, supabase)
  return NextResponse.json(result)
}

async function verifyConnection(
  service: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ ok: boolean; message: string; details?: string }> {
  try {
    switch (service) {
      // --- Brave Search ---
      case 'brave_search': {
        const key = await getKey(supabase, userId, 'brave_search') || process.env.BRAVE_API_KEY
        if (!key) return { ok: false, message: 'No hay API key configurada' }
        const res = await fetch('https://api.search.brave.com/res/v1/web/search?q=test&count=1', {
          headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
        })
        if (res.ok) {
          const data = await res.json()
          const count = data.web?.results?.length || 0
          return { ok: true, message: 'Conexión exitosa', details: `${count} resultado(s) de prueba` }
        }
        return { ok: false, message: `Error HTTP ${res.status}`, details: 'Verifica tu API key' }
      }

      // --- e2b Code Sandbox ---
      case 'e2b': {
        const key = await getKey(supabase, userId, 'e2b') || process.env.E2B_API_KEY
        if (!key) return { ok: false, message: 'No hay API key configurada' }
        const res = await fetch('https://api.e2b.dev/sandboxes', {
          method: 'POST',
          headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: 'python' }),
        })
        if (res.ok) {
          const data = await res.json()
          const sandboxId = data.sandboxId || data.id
          // Clean up test sandbox
          if (sandboxId) {
            fetch(`https://api.e2b.dev/sandboxes/${sandboxId}`, {
              method: 'DELETE', headers: { 'X-API-Key': key },
            }).catch(() => {})
          }
          return { ok: true, message: 'Sandbox creado y destruido OK', details: 'Python sandbox funcional' }
        }
        const errText = await res.text().catch(() => '')
        return { ok: false, message: `Error al crear sandbox`, details: errText.slice(0, 100) }
      }

      // --- Anthropic ---
      case 'anthropic': {
        const key = await getKey(supabase, userId, 'anthropic') || process.env.ANTHROPIC_API_KEY
        if (!key) return { ok: false, message: 'No hay API key configurada' }
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        })
        if (res.ok) {
          return { ok: true, message: 'Claude responde correctamente', details: 'Modelo claude-haiku-4-5 OK' }
        }
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: `Error ${res.status}`, details: (err as { error?: { message?: string } }).error?.message || 'Verifica tu API key' }
      }

      // --- Google Calendar ---
      case 'google_calendar': {
        const token = await getValidGoogleToken(supabase, userId)
        if (!token) return { ok: false, message: 'No hay token de Google', details: 'Inicia sesión con Google primero' }
        const res = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary',
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          const data = await res.json()
          return { ok: true, message: 'Calendario conectado', details: `Calendario: ${data.summary || 'primary'}` }
        }
        return { ok: false, message: `Error ${res.status}`, details: 'Token expirado o permisos insuficientes' }
      }

      // --- Google Drive ---
      case 'google_drive': {
        const token = await getValidGoogleToken(supabase, userId)
        if (!token) return { ok: false, message: 'No hay token de Google' }
        const res = await fetch(
          'https://www.googleapis.com/drive/v3/about?fields=user',
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          const data = await res.json()
          return { ok: true, message: 'Drive conectado', details: `Usuario: ${data.user?.emailAddress || '?'}` }
        }
        return { ok: false, message: `Error ${res.status}`, details: 'Verifica que Google Drive API está habilitada' }
      }

      // --- Gmail ---
      case 'gmail': {
        const token = await getValidGoogleToken(supabase, userId)
        if (!token) return { ok: false, message: 'No hay token de Google' }
        const res = await fetch(
          'https://www.googleapis.com/gmail/v1/users/me/profile',
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          const data = await res.json()
          return { ok: true, message: 'Gmail conectado', details: `Email: ${data.emailAddress || '?'} · ${data.messagesTotal || 0} mensajes` }
        }
        return { ok: false, message: `Error ${res.status}`, details: 'Verifica que Gmail API está habilitada y tienes el scope gmail.readonly' }
      }

      // --- Mac Daemon ---
      case 'mac_daemon': {
        const { data: session } = await supabase
          .from('kira_mac_sessions')
          .select('last_heartbeat, capabilities, mac_id')
          .eq('user_id', userId)
          .order('last_heartbeat', { ascending: false })
          .limit(1)
          .single()

        if (!session) return { ok: false, message: 'Nunca se ha conectado un daemon', details: 'Ejecuta: npx tsx scripts/kira-daemon.ts' }

        const elapsed = Date.now() - new Date(session.last_heartbeat).getTime()
        if (elapsed < 60_000) {
          const caps = session.capabilities as Record<string, boolean> || {}
          const capsStr = Object.entries(caps).filter(([, v]) => v).map(([k]) => k.replace('has_', '')).join(', ')
          return {
            ok: true,
            message: `Mac online (${session.mac_id})`,
            details: capsStr ? `Capacidades: ${capsStr}` : 'Conectado sin capacidades extra',
          }
        }
        const minAgo = Math.round(elapsed / 60_000)
        return { ok: false, message: `Último heartbeat hace ${minAgo} min`, details: `Mac ID: ${session.mac_id} — reinicia el daemon` }
      }

      // --- WhatsApp (SQLite) ---
      case 'whatsapp': {
        try {
          const { checkWhatsAppStatus } = await import('@/lib/tools/whatsapp')
          const status = await checkWhatsAppStatus()
          if (status.online) {
            return { ok: true, message: 'WhatsApp conectado', details: `${status.chatCount} chats, ${status.messageCount} mensajes en DB` }
          }
          return { ok: false, message: 'DB no disponible', details: status.error || 'Ejecuta el bridge primero' }
        } catch (e) {
          return { ok: false, message: 'Error', details: e instanceof Error ? e.message : 'Unknown' }
        }
      }

      default:
        return { ok: false, message: 'Servicio no soportado para verificación' }
    }
  } catch (err) {
    return { ok: false, message: 'Error de conexión', details: err instanceof Error ? err.message : 'Unknown' }
  }
}

async function getKey(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, service: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_api_keys')
    .select('api_key')
    .eq('user_id', userId)
    .eq('service', service)
    .single()
  return data?.api_key || null
}
