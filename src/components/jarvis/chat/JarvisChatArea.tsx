'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Cpu } from 'lucide-react'
import { useJarvisStore } from '@/stores/jarvisStore'
import { JarvisMessageBubble } from './JarvisMessageBubble'
import { JarvisInputArea } from './JarvisInputArea'
import { JarvisStreamingDots } from './JarvisStreamingDots'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function JarvisChatArea() {
  const messages = useJarvisStore((s) => s.messages)
  const streamState = useJarvisStore((s) => s.streamState)
  const serverOnline = useJarvisStore((s) => s.serverOnline)
  const serverInfo = useJarvisStore((s) => s.serverInfo)
  const listRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)

  useEffect(() => {
    if (shouldAutoScroll.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, streamState.content])

  const handleScroll = () => {
    if (!listRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100
  }

  const isEmpty = messages.length === 0 && !streamState.isStreaming

  return (
    <div className="flex flex-col h-full">
      {/* Server status */}
      {!serverOnline && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          Jarvis backend offline — run <code className="font-mono bg-white/[0.06] px-1 rounded">uv run jarvis serve</code>
        </motion.div>
      )}

      {serverOnline && serverInfo && (
        <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-1.5 text-[10px] text-muted-foreground/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {serverInfo.engine} &middot; {serverInfo.model}
        </div>
      )}

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-14 h-14 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center mb-5"
            >
              <Cpu size={28} className="text-[#00D4FF]" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-semibold text-foreground mb-2"
            >
              {getGreeting()}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-muted-foreground text-center max-w-sm mb-6"
            >
              Multi-engine AI assistant. Local-first, private, and always available.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-2 justify-center"
            >
              {[
                'What can you do?',
                'Summarize my recent emails',
                'Search my documents',
                'Write a Python script',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    const textarea = document.querySelector<HTMLTextAreaElement>('textarea')
                    if (textarea) {
                      const nativeSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLTextAreaElement.prototype,
                        'value',
                      )?.set
                      nativeSetter?.call(textarea, q)
                      textarea.dispatchEvent(new Event('input', { bubbles: true }))
                      textarea.focus()
                    }
                  }}
                  className="px-3 py-2 rounded-xl text-xs text-muted-foreground bg-white/[0.04] border border-white/[0.06] hover:border-[#00D4FF]/30 hover:text-foreground transition-all cursor-pointer"
                >
                  <Sparkles size={10} className="inline mr-1.5 text-[#00D4FF]" />
                  {q}
                </button>
              ))}
            </motion.div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <JarvisMessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>
            {streamState.isStreaming && streamState.content === '' && (
              <div className="flex justify-start mb-4">
                <JarvisStreamingDots phase={streamState.phase} />
              </div>
            )}
          </div>
        )}
      </div>

      <JarvisInputArea />
    </div>
  )
}
