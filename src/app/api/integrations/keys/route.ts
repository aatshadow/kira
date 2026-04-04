import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — Fetch all user API keys (masked)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: keys } = await supabase
    .from('user_api_keys')
    .select('service, api_key, is_valid, metadata, updated_at')
    .eq('user_id', user.id)

  // Mask keys for display (show last 4 chars only)
  const masked = (keys || []).map(k => ({
    service: k.service,
    masked_key: k.api_key ? `${'•'.repeat(20)}${k.api_key.slice(-4)}` : '',
    has_key: !!k.api_key,
    is_valid: k.is_valid,
    metadata: k.metadata,
    updated_at: k.updated_at,
  }))

  return NextResponse.json({ keys: masked })
}

// POST — Save or update an API key
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { service, api_key, metadata } = await request.json()

  if (!service || !api_key) {
    return NextResponse.json({ error: 'Service and API key required' }, { status: 400 })
  }

  // Validate key before saving (basic checks)
  const validation = await validateApiKey(service, api_key)

  const { error } = await supabase
    .from('user_api_keys')
    .upsert({
      user_id: user.id,
      service,
      api_key,
      is_valid: validation.valid,
      metadata: metadata || {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,service' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    valid: validation.valid,
    message: validation.message,
  })
}

// DELETE — Remove an API key
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { service } = await request.json()
  if (!service) return NextResponse.json({ error: 'Service required' }, { status: 400 })

  await supabase
    .from('user_api_keys')
    .delete()
    .eq('user_id', user.id)
    .eq('service', service)

  return NextResponse.json({ ok: true })
}

// --- Key validation per service ---
async function validateApiKey(service: string, key: string): Promise<{ valid: boolean; message: string }> {
  try {
    switch (service) {
      case 'brave_search': {
        const res = await fetch('https://api.search.brave.com/res/v1/web/search?q=test&count=1', {
          headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
        })
        return res.ok
          ? { valid: true, message: 'Brave Search API conectada correctamente' }
          : { valid: false, message: `Error: ${res.status} — verifica tu API key` }
      }

      case 'e2b': {
        const res = await fetch('https://api.e2b.dev/sandboxes', {
          method: 'POST',
          headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: 'python' }),
        })
        if (res.ok) {
          // Kill the test sandbox immediately
          const data = await res.json()
          const sandboxId = data.sandboxId || data.id
          if (sandboxId) {
            fetch(`https://api.e2b.dev/sandboxes/${sandboxId}`, {
              method: 'DELETE',
              headers: { 'X-API-Key': key },
            }).catch(() => {})
          }
          return { valid: true, message: 'e2b Code Sandbox conectado correctamente' }
        }
        return { valid: false, message: 'API key inválida o sin permisos' }
      }

      case 'anthropic': {
        // Quick validation - just check the key format
        if (key.startsWith('sk-ant-')) {
          return { valid: true, message: 'Formato de API key válido' }
        }
        return { valid: false, message: 'La key debe empezar con sk-ant-' }
      }

      case 'mac_daemon': {
        // This is a secret we generate, not validate externally
        return { valid: true, message: 'Secret del daemon guardado' }
      }

      default:
        return { valid: true, message: 'Key guardada (sin validación disponible)' }
    }
  } catch (err) {
    return { valid: false, message: `Error de conexión: ${err instanceof Error ? err.message : 'Unknown'}` }
  }
}
