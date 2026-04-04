'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { MessageSquare, ChevronRight, Mic, MicOff, Loader2, Globe } from 'lucide-react'
import { KiraLogo } from '@/components/shared/KiraLogo'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTasks } from '@/lib/hooks/useTasks'
import { useTaskStore } from '@/stores/taskStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { useMeetings } from '@/lib/hooks/useMeetings'

interface Conversation {
  id: string
  title: string
  updated_at: string
}

export default function HomePage() {
  const router = useRouter()
  const [now, setNow] = useState(new Date())
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [lang, setLang] = useState<'en' | 'es'>('en')
  const [listeningMode, setListeningMode] = useState<'off' | 'active' | 'persistent'>('off')
  const [orbText, setOrbText] = useState('') // transcribed text
  const [orbResponse, setOrbResponse] = useState('') // KIRA response
  const [orbProcessing, setOrbProcessing] = useState(false)
  const [orbSpeaking, setOrbSpeaking] = useState(false)
  const orbSpeakingRef = useRef(false) // ref mirror for use in callbacks
  const lastTapRef = useRef(0)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const orbConvIdRef = useRef<string | null>(null)

  useTasks()
  useMeetings()
  const tasks = useTaskStore((s) => s.tasks)
  const categories = useTaskStore((s) => s.categories)
  const projects = useTaskStore((s) => s.projects)
  const tags = useTaskStore((s) => s.tags)
  const meetings = useMeetingStore((s) => s.meetings)

  // Update clock every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  // Load recent conversations + set the active one for the orb
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/ai/conversations')
        if (res.ok) {
          const data = await res.json()
          const convs = (data.conversations || []).slice(0, 3)
          setConversations(convs)
          // Use the most recent conversation for the orb (continuous conversation)
          if (convs.length > 0 && !orbConvIdRef.current) {
            orbConvIdRef.current = convs[0].id
          }
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

  // Build context for chat API
  const buildContext = useCallback(() => ({
    tasks: tasks.filter(t => t.status !== 'deleted').map(t => ({
      id: t.id, title: t.title, status: t.status, priority: t.priority,
      category: categories.find(c => c.id === t.category_id)?.name || null,
      project: projects.find(p => p.id === t.project_id)?.name || null,
      due_date: t.due_date, estimated_mins: t.estimated_mins, tags: t.tags || [],
    })),
    meetings: meetings.map(m => ({
      id: m.id, title: m.title, status: m.status, scheduled_at: m.scheduled_at,
      duration_mins: m.duration_mins, participants: m.participants,
    })),
    categories: categories.map(c => ({ id: c.id, name: c.name })),
    projects: projects.map(p => ({ id: p.id, name: p.name })),
    tags: tags.map(t => ({ id: t.id, name: t.name })),
    today: new Date().toISOString().split('T')[0],
  }), [tasks, categories, projects, tags, meetings])

  // Send message to KIRA and get voice response
  const sendOrbMessage = useCallback(async (text: string) => {
    if (!text.trim() || orbProcessing) return
    setOrbProcessing(true)
    setOrbText(text)
    setOrbResponse('')

    try {
      // Load conversation history for context
      let prevMessages: Array<{ role: string; content: string }> = []
      if (orbConvIdRef.current) {
        try {
          const histRes = await fetch(`/api/ai/conversations?id=${orbConvIdRef.current}`)
          if (histRes.ok) {
            const histData = await histRes.json()
            prevMessages = (histData.messages || [])
              .filter((m: { content: string | null }) => m.content)
              .slice(-10) // last 10 messages for context
              .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }))
          }
        } catch { /* ignore */ }
      }

      const messages = [...prevMessages, { role: 'user', content: text }]
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          context: buildContext(),
          conversationId: orbConvIdRef.current,
          language: lang,
        }),
      })

      if (!res.ok) throw new Error('Chat failed')
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''
      let eventType = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7)
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6))
              if (eventType === 'text') {
                fullText += data.text
                setOrbResponse(fullText.replace(/```kira-action\n[\s\S]*?```/g, '').trim())
              } else if (eventType === 'done' && data.conversationId) {
                orbConvIdRef.current = data.conversationId
              }
            } catch { /* skip */ }
            eventType = ''
          }
        }
      }

      // Speak the response
      const cleanText = fullText.replace(/```kira-action\n[\s\S]*?```/g, '').trim()
      if (cleanText) {
        setOrbSpeaking(true)
        orbSpeakingRef.current = true
        try {
          const ttsRes = await fetch('/api/ai/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText }),
          })
          if (ttsRes.ok) {
            const blob = await ttsRes.blob()
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            audioRef.current = audio
            audio.onended = () => {
              setOrbSpeaking(false)
              orbSpeakingRef.current = false
              URL.revokeObjectURL(url)
            }
            audio.onerror = () => {
              setOrbSpeaking(false)
              orbSpeakingRef.current = false
              URL.revokeObjectURL(url)
            }
            await audio.play()
          } else {
            setOrbSpeaking(false)
            orbSpeakingRef.current = false
          }
        } catch {
          setOrbSpeaking(false)
          orbSpeakingRef.current = false
        }
      }

      // Reload conversations list
      try {
        const convRes = await fetch('/api/ai/conversations')
        if (convRes.ok) {
          const convData = await convRes.json()
          setConversations((convData.conversations || []).slice(0, 3))
        }
      } catch { /* ignore */ }
    } catch {
      setOrbResponse(lang === 'es' ? 'Error conectando con KIRA.' : 'Error connecting to KIRA.')
    } finally {
      setOrbProcessing(false)
    }
  }, [orbProcessing, buildContext, lang])

  // Voice conversation active flag
  const voiceActiveRef = useRef(false)
  const pendingTextRef = useRef('')
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Start voice recognition (auto-sends after 2s of silence)
  const startListening = useCallback(() => {
    // Don't start if already listening
    if (recognitionRef.current) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) { router.push('/kira'); return }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = lang === 'es' ? 'es-ES' : 'en-US'
    recognition.interimResults = true
    recognition.continuous = true // keep listening — we manage silence ourselves

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let transcript = ''
      let isFinal = false
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
        if (event.results[i].isFinal) isFinal = true
      }

      pendingTextRef.current = transcript
      setOrbText(transcript)

      // Reset silence timer every time we get speech
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)

      // After a final result, start a 2s silence countdown to auto-send
      if (isFinal && transcript.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          const text = pendingTextRef.current.trim()
          if (text && voiceActiveRef.current) {
            // Stop recognition, send message
            if (recognitionRef.current) {
              try { recognitionRef.current.stop() } catch { /* ignore */ }
              recognitionRef.current = null
            }
            setListeningMode('off')
            pendingTextRef.current = ''
            sendOrbMessageRef.current(text)
          }
        }, 2000)
      }
    }

    recognition.onend = () => {
      recognitionRef.current = null
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
      // If voice is still active but we didn't send, restart
      if (voiceActiveRef.current && !orbProcessing) {
        const text = pendingTextRef.current.trim()
        if (text) {
          // Had text but recognition ended (browser limit) — send it
          pendingTextRef.current = ''
          setListeningMode('off')
          sendOrbMessageRef.current(text)
        } else {
          // No text, restart listening
          try {
            const newRecog = new SpeechRecognitionAPI()
            newRecog.lang = lang === 'es' ? 'es-ES' : 'en-US'
            newRecog.interimResults = true
            newRecog.continuous = true
            newRecog.onresult = recognition.onresult
            newRecog.onend = recognition.onend
            newRecog.onerror = recognition.onerror
            newRecog.start()
            recognitionRef.current = newRecog
          } catch { setListeningMode('off') }
        }
      } else if (!voiceActiveRef.current) {
        setListeningMode('off')
      }
    }

    recognition.onerror = () => {
      recognitionRef.current = null
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
      if (voiceActiveRef.current) {
        setTimeout(() => {
          if (voiceActiveRef.current) startListening()
        }, 500)
      } else {
        setListeningMode('off')
      }
    }

    recognition.start()
    recognitionRef.current = recognition
    setListeningMode('persistent')
    setOrbText('')
  }, [router, lang]) // sendOrbMessage added via ref pattern below

  // We use refs to avoid circular deps between sendOrbMessage ↔ startListening
  const sendOrbMessageRef = useRef(sendOrbMessage)
  sendOrbMessageRef.current = sendOrbMessage
  const startListeningRef = useRef(startListening)
  startListeningRef.current = startListening

  // Stop everything
  const stopVoiceConversation = useCallback(() => {
    voiceActiveRef.current = false
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setListeningMode('off')
    setOrbSpeaking(false)
    setOrbProcessing(false)
    setOrbText('')
    pendingTextRef.current = ''
  }, [])

  // Start voice conversation
  const startVoiceConversation = useCallback(() => {
    voiceActiveRef.current = true
    setOrbResponse('')
    startListening()
  }, [startListening])

  // After KIRA finishes speaking → auto-listen again
  useEffect(() => {
    if (!orbSpeaking && voiceActiveRef.current && !orbProcessing && listeningMode === 'off') {
      // Small delay before listening again
      const timer = setTimeout(() => {
        if (voiceActiveRef.current && !orbProcessing) {
          startListening()
        }
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [orbSpeaking, orbProcessing, listeningMode, startListening])

  // Double-tap: toggle voice conversation
  // Single tap: navigate to KIRA chat
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleOrbTap = useCallback(() => {
    const tapNow = Date.now()
    const timeSinceLastTap = tapNow - lastTapRef.current
    lastTapRef.current = tapNow

    // Clear pending single tap
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current)
      singleTapTimerRef.current = null
    }

    if (timeSinceLastTap < 400) {
      // Double tap — toggle voice conversation
      if (voiceActiveRef.current) {
        stopVoiceConversation()
      } else {
        startVoiceConversation()
      }
    } else {
      // Single tap while KIRA is speaking → interrupt and listen
      if (orbSpeakingRef.current && voiceActiveRef.current) {
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
          audioRef.current = null
        }
        setOrbSpeaking(false)
        orbSpeakingRef.current = false
        setOrbResponse('')
        startListening()
        return
      }
      // Wait to see if double tap
      singleTapTimerRef.current = setTimeout(() => {
        if (!voiceActiveRef.current && !orbProcessing && !orbSpeaking) {
          router.push('/kira')
        }
      }, 400)
    }
  }, [orbProcessing, orbSpeaking, router, startVoiceConversation, stopVoiceConversation, startListening])

  const handleOrbPressStart = useCallback(() => {
    holdTimerRef.current = setTimeout(() => {
      if (!voiceActiveRef.current) startVoiceConversation()
    }, 600)
  }, [startVoiceConversation])

  const handleOrbPressEnd = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* */ }
      if (audioRef.current) audioRef.current.pause()
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }
  }, [])

  const day = lang === 'es' ? format(now, 'EEEE', { locale: es }) : format(now, 'EEEE')
  const date = lang === 'es' ? format(now, 'd MMMM', { locale: es }) : format(now, 'MMMM d')
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

      {/* Language toggle */}
      <motion.button
        onClick={() => setLang(l => l === 'en' ? 'es' : 'en')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        whileTap={{ scale: 0.9 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-colors cursor-pointer mb-6"
      >
        <Globe className="h-3 w-3 text-[#00D4FF]/60" />
        <span className="text-[11px] font-medium text-foreground/70 uppercase tracking-wider">
          {lang === 'en' ? 'EN' : 'ES'}
        </span>
      </motion.button>

      {/* KIRA Orb — center piece */}
      <motion.div
        className="relative mb-12"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
      >
        {/* Outer glow rings */}
        <AnimatePresence>
          {(listeningMode !== 'off' || orbSpeaking || orbProcessing) && (
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
            orbSpeaking
              ? 'shadow-[0_0_60px_rgba(0,212,255,0.5),0_0_120px_rgba(0,212,255,0.2)]'
              : listeningMode === 'persistent'
                ? 'shadow-[0_0_60px_rgba(0,212,255,0.4),0_0_120px_rgba(0,212,255,0.15)]'
                : orbProcessing
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
          {(listeningMode !== 'off' || orbSpeaking || orbProcessing) && (
            <motion.p
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-[#00D4FF] whitespace-nowrap"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {orbSpeaking
                ? (lang === 'es' ? 'KIRA hablando · tap para interrumpir' : 'KIRA speaking · tap to interrupt')
                : orbProcessing
                  ? (lang === 'es' ? 'Pensando...' : 'Thinking...')
                  : (lang === 'es' ? 'Escuchando · doble tap para parar' : 'Listening · double tap to stop')}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Voice status / response */}
      <div className="text-center mb-8 min-h-[60px] max-w-md px-4">
        <AnimatePresence mode="wait">
          {orbProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2"
            >
              <Loader2 className="h-3.5 w-3.5 text-[#00D4FF] animate-spin" />
              <span className="text-xs text-muted-foreground">{lang === 'es' ? 'Procesando...' : 'Processing...'}</span>
            </motion.div>
          ) : orbSpeaking || orbResponse ? (
            <motion.p
              key="response"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-foreground/80 leading-relaxed line-clamp-3"
            >
              {orbResponse}
            </motion.p>
          ) : listeningMode !== 'off' ? (
            <motion.div
              key="listening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm text-foreground/70">{orbText || (lang === 'es' ? 'Escuchando...' : 'Listening...')}</p>
              <p className="text-[10px] text-[#00D4FF]/60 mt-1">{lang === 'es' ? 'Habla — KIRA te escucha' : 'Speak — KIRA is listening'}</p>
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-muted-foreground/40"
            >
              {lang === 'es' ? 'Doble tap para hablar · Tap para chat' : 'Double tap to talk · Tap for chat'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

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
