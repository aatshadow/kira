'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Demo mode: accept any credentials
    if (!email || !password) {
      setError('Introduce email y contraseña')
      setLoading(false)
      return
    }

    // Set demo session cookie
    document.cookie = 'kira_session=active; path=/; max-age=604800; SameSite=Lax'

    // Small delay for UX feel
    await new Promise((r) => setTimeout(r, 400))

    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080808]">
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold tracking-[0.2em] text-foreground mb-2">KIRA</h1>
          <div className="h-px w-12 mx-auto bg-[#00D4FF] mb-4" />
          <p className="text-xs text-muted-foreground tracking-wider uppercase">
            Operating Intelligence
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-[#0F0F0F] border-[#242424] focus:border-[#00D4FF] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.08)]"
              autoFocus
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-[#0F0F0F] border-[#242424] focus:border-[#00D4FF] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.08)]"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#00D4FF] text-black font-semibold hover:bg-[#00A8CC] hover:shadow-[0_0_8px_rgba(0,212,255,0.4)] transition-all"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="text-[10px] text-muted-foreground/40 text-center mt-8">
          Acceso privado — KIRA Founder Intelligence
        </p>
      </div>
    </div>
  )
}
