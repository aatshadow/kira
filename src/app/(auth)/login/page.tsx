'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KiraLogo } from '@/components/shared/KiraLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO } from '@/lib/demo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Introduce email y contraseña')
      setLoading(false)
      return
    }

    if (IS_DEMO) {
      document.cookie = 'kira_session=active; path=/; max-age=604800; SameSite=Lax'
      await new Promise((r) => setTimeout(r, 400))
      router.push('/')
      router.refresh()
      return
    }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : authError.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.readonly',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080808]">
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="mx-auto mb-4 flex justify-center"><KiraLogo size="xl" /></div>
          <h1 className="text-2xl font-bold tracking-[0.2em] text-foreground mb-2">KIRA</h1>
          <div className="h-px w-12 mx-auto bg-[#00D4FF] mb-4" />
          <p className="text-xs text-muted-foreground tracking-wider uppercase">
            Operating Intelligence
          </p>
        </div>

        {/* Google login */}
        <Button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          variant="outline"
          className="w-full h-11 mb-4 bg-[#0F0F0F] border-[#242424] hover:bg-[#1A1A1A] hover:border-[#333] text-foreground font-medium"
        >
          {googleLoading ? (
            'Conectando...'
          ) : (
            <>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continuar con Google
            </>
          )}
        </Button>

        {/* Divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#242424]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#080808] px-3 text-muted-foreground/50">o</span>
          </div>
        </div>

        {/* Email/password form */}
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
