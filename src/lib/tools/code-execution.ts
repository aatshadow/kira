import { getApiKey } from './keys'

export interface CodeResult {
  stdout: string
  stderr: string
  error?: string
}

export async function executeCode(code: string, language: string = 'python', userId: string): Promise<CodeResult> {
  const apiKey = await getApiKey('e2b', userId)
  if (!apiKey) {
    return { stdout: '', stderr: '', error: 'e2b API no configurada. Ve a Settings → Integraciones para añadir tu API key.' }
  }

  try {
    // Create a sandbox
    const createRes = await fetch('https://api.e2b.dev/sandboxes', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ template: language === 'javascript' || language === 'js' ? 'node' : 'python' }),
    })

    if (!createRes.ok) {
      const err = await createRes.text()
      return { stdout: '', stderr: '', error: `Sandbox creation failed: ${err}` }
    }

    const sandbox = await createRes.json()
    const sandboxId = sandbox.sandboxId || sandbox.id

    try {
      // Execute code
      const execRes = await fetch(`https://api.e2b.dev/sandboxes/${sandboxId}/code/execution`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language }),
      })

      if (!execRes.ok) {
        const err = await execRes.text()
        return { stdout: '', stderr: '', error: `Execution failed: ${err}` }
      }

      const result = await execRes.json()
      return {
        stdout: (result.stdout || '').slice(0, 5000),
        stderr: (result.stderr || '').slice(0, 2000),
      }
    } finally {
      // Kill sandbox
      fetch(`https://api.e2b.dev/sandboxes/${sandboxId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey },
      }).catch(() => {})
    }
  } catch (err) {
    return { stdout: '', stderr: '', error: err instanceof Error ? err.message : 'Code execution failed' }
  }
}
