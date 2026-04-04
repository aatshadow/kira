#!/usr/bin/env npx tsx
/**
 * KIRA Mac Daemon
 *
 * Runs on the user's Mac to:
 * 1. Send heartbeat every 30s to KIRA server
 * 2. Poll for pending tasks every 5s
 * 3. Execute tasks locally (shell, scraping, code, Jarvis agents)
 * 4. Report results back
 *
 * Usage:
 *   cd /Users/alex/KIRA/kira
 *   npx tsx scripts/kira-daemon.ts
 *
 * Environment (reads from .env.local):
 *   KIRA_URL — Base URL of KIRA app (default: http://localhost:3000)
 *   MAC_DAEMON_SECRET — Auth secret for daemon API
 *   KIRA_USER_ID — Your Supabase user ID
 */

import { execSync, exec } from 'child_process'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { hostname } from 'os'

// Load .env.local
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx)
      const value = trimmed.slice(eqIdx + 1)
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env.local not found, use existing env vars
  }
}

loadEnv()

const KIRA_URL = process.env.KIRA_URL || 'http://localhost:3000'
const MAC_SECRET = process.env.MAC_DAEMON_SECRET || ''
const USER_ID = process.env.KIRA_USER_ID || ''
const MAC_ID = hostname()

if (!MAC_SECRET || !USER_ID) {
  console.error('ERROR: Set MAC_DAEMON_SECRET and KIRA_USER_ID in .env.local')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'x-mac-secret': MAC_SECRET,
}

// --- Heartbeat ---
async function sendHeartbeat() {
  try {
    const loadInfo = {
      uptime: process.uptime(),
      platform: process.platform,
      arch: process.arch,
    }

    // Check capabilities
    const capabilities: Record<string, boolean> = {}
    try { execSync('which ollama', { stdio: 'ignore' }); capabilities.has_ollama = true } catch { capabilities.has_ollama = false }
    try { execSync('curl -s http://127.0.0.1:8000/health', { stdio: 'ignore', timeout: 2000 }); capabilities.has_jarvis = true } catch { capabilities.has_jarvis = false }
    try { execSync('which python3', { stdio: 'ignore' }); capabilities.has_python = true } catch { capabilities.has_python = false }

    await fetch(`${KIRA_URL}/api/mac/heartbeat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: USER_ID,
        mac_id: MAC_ID,
        capabilities,
        load: loadInfo,
      }),
    })
  } catch (err) {
    console.error('[Heartbeat] Failed:', (err as Error).message)
  }
}

// --- Task Execution ---
async function executeTask(task: {
  id: string
  type: string
  payload: Record<string, unknown>
}): Promise<{ result?: unknown; error?: string }> {
  // Mark as running
  await fetch(`${KIRA_URL}/api/mac/tasks`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ task_id: task.id, status: 'running' }),
  })

  try {
    switch (task.type) {
      case 'shell': {
        const command = (task.payload.command as string) || 'echo "No command specified"'
        console.log(`[Task ${task.id}] Running shell: ${command.slice(0, 100)}`)
        const output = execSync(command, {
          timeout: 300_000, // 5 min max
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        })
        return { result: { stdout: output.slice(0, 50_000) } }
      }

      case 'scrape': {
        const urls = (task.payload.urls as string[]) || []
        const script = task.payload.script as string
        if (script) {
          // Run custom scraping script
          const output = execSync(`python3 -c ${JSON.stringify(script)}`, {
            timeout: 600_000, // 10 min
            encoding: 'utf-8',
          })
          return { result: { output: output.slice(0, 50_000) } }
        }
        // Simple URL fetch
        const results: Array<{ url: string; content: string }> = []
        for (const url of urls.slice(0, 20)) {
          try {
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
            const text = await res.text()
            results.push({ url, content: text.slice(0, 5000) })
          } catch {
            results.push({ url, content: 'FETCH_ERROR' })
          }
        }
        return { result: { pages: results } }
      }

      case 'code_exec': {
        const code = task.payload.code as string
        const lang = (task.payload.language as string) || 'python'
        const cmd = lang === 'javascript' || lang === 'js'
          ? `node -e ${JSON.stringify(code)}`
          : `python3 -c ${JSON.stringify(code)}`

        const output = execSync(cmd, {
          timeout: 120_000,
          encoding: 'utf-8',
        })
        return { result: { stdout: output.slice(0, 50_000) } }
      }

      case 'jarvis_agent': {
        // Forward to local Jarvis if running
        const jarvisRes = await fetch('http://127.0.0.1:8000/v1/managed-agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task.payload),
        })
        const data = await jarvisRes.json()
        return { result: data }
      }

      default:
        return { error: `Unknown task type: ${task.type}` }
    }
  } catch (err) {
    return { error: (err as Error).message?.slice(0, 2000) || 'Execution failed' }
  }
}

// --- Poll for tasks ---
async function pollTasks() {
  try {
    const res = await fetch(
      `${KIRA_URL}/api/mac/tasks?user_id=${USER_ID}&mac_id=${MAC_ID}`,
      { headers }
    )
    if (!res.ok) return

    const { tasks } = await res.json()
    if (!tasks?.length) return

    for (const task of tasks) {
      console.log(`[Task ${task.id}] Executing: ${task.type}`)
      const { result, error } = await executeTask(task)

      // Report result
      await fetch(`${KIRA_URL}/api/mac/tasks`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          task_id: task.id,
          status: error ? 'failed' : 'completed',
          result,
          error,
        }),
      })

      console.log(`[Task ${task.id}] ${error ? 'FAILED' : 'COMPLETED'}`)
    }
  } catch (err) {
    console.error('[Poll] Failed:', (err as Error).message)
  }
}

// --- Main loop ---
console.log(`
  ╔══════════════════════════════════════╗
  ║         KIRA Mac Daemon              ║
  ║                                      ║
  ║  Server: ${KIRA_URL.padEnd(27)}║
  ║  Mac ID: ${MAC_ID.slice(0, 27).padEnd(27)}║
  ╚══════════════════════════════════════╝
`)

// Initial heartbeat
sendHeartbeat()

// Heartbeat every 30s
setInterval(sendHeartbeat, 30_000)

// Poll tasks every 5s
setInterval(pollTasks, 5_000)

// Keep alive
console.log('Daemon running. Press Ctrl+C to stop.\n')
