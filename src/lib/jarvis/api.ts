import type { JarvisModelInfo, JarvisSavingsData, JarvisServerInfo, JarvisManagedAgent } from '@/types/jarvis'

export async function fetchJarvisModels(): Promise<JarvisModelInfo[]> {
  const res = await fetch('/api/jarvis/models')
  if (!res.ok) return []
  const data = await res.json()
  return data.data || []
}

export async function checkJarvisHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/jarvis/health')
    const data = await res.json()
    return data.status === 'ok'
  } catch {
    return false
  }
}

export async function fetchJarvisInfo(): Promise<JarvisServerInfo | null> {
  try {
    const res = await fetch('/api/jarvis/info')
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchJarvisSavings(): Promise<JarvisSavingsData | null> {
  try {
    const res = await fetch('/api/jarvis/savings')
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchJarvisEnergy(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch('/api/jarvis/telemetry/energy')
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchJarvisTelemetryStats(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch('/api/jarvis/telemetry/stats')
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchJarvisAgents(): Promise<JarvisManagedAgent[]> {
  try {
    const res = await fetch('/api/jarvis/agents')
    if (!res.ok) return []
    const data = await res.json()
    return data.agents || data || []
  } catch {
    return []
  }
}

export async function syncTelemetry(data: Record<string, unknown>): Promise<void> {
  await fetch('/api/jarvis/sync-telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}
