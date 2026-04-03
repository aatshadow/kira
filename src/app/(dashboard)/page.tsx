'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { MessageSquare, ChevronRight, Mic, MicOff } from 'lucide-react'
import { KiraLogo } from '@/components/shared/KiraLogo'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Conversation {
  id: string
  title: string
  updated_at: string
}

export default function HomePage() {
  const router = useRouter()
  const [now, setNow] = useState(new Date())
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [listeningMode, setListeningMode] = useState<'off' | 'active' | 'persistent'>('off')
  const lastTapRef = useRef(0)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Update clock every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  // Load recent conversations
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/ai/conversations')
        if (res.ok) {
          const data = await res.json()
          setConversations((data.conversations || []).slice(0, 3))
        }
      } catch { /* ignore */ }
    }
    load()
  }, [])

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  // Double-tap: toggle persistent listening
  // Single tap: one-shot listening (navigates to KIRA chat)
  // Long press: persistent mode
  const handleOrbTap = useCallback(() => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTapRef.current
    lastTapRef.current = now

    if (timeSinceLastTap < 350) {
      // Double tap
      if (listeningMode === 'persistent') {
        setListeningMode('off')
      } else {
        setListeningMode('persistent')
      }
    } else {
      // Single tap — navigate to KIRA chat
      if (listeningMode === 'off') {
        router.push('/kira')
      }
    }
  }, [listeningMode, router])

  const handleOrbPressStart = useCallback(() => {
    holdTimerRef.current = setTimeout(() => {
      setListeningMode('persistent')
    }, 600)
  }, [])

  const handleOrbPressEnd = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }, [])

  const day = format(now, 'EEEE', { locale: es })
  const date = format(now, 'd MMMM', { locale: es })
  const time = format(now, 'HH:mm')

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Date & Time */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <p className="text-muted-foreground/60 text-xs font-medium uppercase tracking-[0.2em] mb-1">
          {day}
        </p>
        <p className="text-muted-foreground text-sm">
          {date}
        </p>
        <p className="text-5xl font-light text-foreground tabular-nums tracking-tight mt-1">
          {time}
        </p>
      </motion.div>

      {/* KIRA Orb — center piece */}
      <motion.div
        className="relative mb-12"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
      >
        {/* Outer glow rings */}
        <AnimatePresence>
          {listeningMode !== 'off' && (
            <>
              <motion.div
                className="absolute inset-[-20px] rounded-full border border-[#00D4FF]/20"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              />
              <motion.div
                className="absolute inset-[-40px] rounded-full border border-[#00D4FF]/10"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-[-60px] rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)' }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Orb button */}
        <motion.button
          onClick={handleOrbTap}
          onMouseDown={handleOrbPressStart}
          onMouseUp={handleOrbPressEnd}
          onTouchStart={handleOrbPressStart}
          onTouchEnd={handleOrbPressEnd}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'relative h-28 w-28 rounded-full cursor-pointer flex items-center justify-center transition-shadow duration-500',
            listeningMode === 'persistent'
              ? 'shadow-[0_0_60px_rgba(0,212,255,0.4),0_0_120px_rgba(0,212,255,0.15)]'
              : listeningMode === 'active'
                ? 'shadow-[0_0_40px_rgba(0,212,255,0.3)]'
                : 'shadow-[0_0_30px_rgba(0,212,255,0.15)]'
          )}
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(139,92,246,0.1) 100%)',
            border: '1px solid rgba(0,212,255,0.2)',
          }}
        >
          <div className="absolute inset-0 rounded-full bg-black/30" />
          <div className="relative">
            <KiraLogo size="xl" />
          </div>

          {/* Listening indicator */}
          <AnimatePresence>
            {listeningMode !== 'off' && (
              <motion.div
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[#00D4FF] flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                {listeningMode === 'persistent' ? (
                  <Mic className="h-3.5 w-3.5 text-black" />
                ) : (
                  <MicOff className="h-3.5 w-3.5 text-black" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Mode label */}
        <AnimatePresence>
          {listeningMode === 'persistent' && (
            <motion.p
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-[#00D4FF] whitespace-nowrap"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              Escuchando — doble tap para cerrar
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Hint text */}
      <motion.p
        className="text-[11px] text-muted-foreground/40 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Toca para hablar con KIRA
      </motion.p>

      {/* Recent conversations */}
      {conversations.length > 0 && (
        <motion.div
          className="w-full max-w-sm space-y-1.5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em] font-medium">Recientes</p>
            <button
              onClick={() => router.push('/kira')}
              className="text-[10px] text-[#00D4FF]/50 hover:text-[#00D4FF] transition-colors cursor-pointer"
            >
              Ver todo
            </button>
          </div>
          {conversations.map((conv, i) => (
            <motion.button
              key={conv.id}
              onClick={() => router.push(`/kira?conv=${conv.id}`)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
            >
              <div className="h-8 w-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-foreground truncate">{conv.title}</p>
              </div>
              <span className="text-[10px] text-muted-foreground/40 shrink-0">{formatTimeAgo(conv.updated_at)}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0" />
            </motion.button>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
