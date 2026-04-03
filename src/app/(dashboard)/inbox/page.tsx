'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, Mail, Instagram, Linkedin, Search, Filter,
  ArrowLeft, Send, Pin, Star, MoreHorizontal, ChevronDown,
  Loader2, Inbox as InboxIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInboxStore, type InboxThread, type InboxMessage } from '@/stores/inboxStore'
import { PageWrapper } from '@/components/shared/PageWrapper'
import { fadeUp, staggerContainer, tapBounce } from '@/lib/animations'

const CHANNELS = [
  { id: null, label: 'Todos', icon: InboxIcon },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
  { id: 'gmail', label: 'Gmail', icon: Mail, color: '#EA4335' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
] as const

const PIPELINES = [
  { id: null, label: 'Todos' },
  { id: 'new', label: 'Nuevos' },
  { id: 'replied', label: 'Respondido' },
  { id: 'follow_up', label: 'Follow up' },
  { id: 'closed', label: 'Cerrado' },
] as const

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  gmail: '#EA4335',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageCircle,
  gmail: Mail,
  instagram: Instagram,
  linkedin: Linkedin,
}

function formatTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMins = Math.round((now.getTime() - d.getTime()) / 60000)
  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `${diffMins}m`
  if (diffMins < 1440) return `${Math.round(diffMins / 60)}h`
  if (diffMins < 10080) return `${Math.round(diffMins / 1440)}d`
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function InboxPage() {
  const {
    threads, messages, loading, activeThread,
    channelFilter, pipelineFilter,
    setThreads, setMessages, setLoading,
    setActiveThread, setChannelFilter, setPipelineFilter,
    updateThread,
  } = useInboxStore()

  const [search, setSearch] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [showPipeline, setShowPipeline] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (channelFilter) params.set('channel', channelFilter)
      if (pipelineFilter) params.set('pipeline', pipelineFilter)
      const res = await fetch(`/api/inbox/threads?${params}`)
      if (res.ok) {
        const data = await res.json()
        setThreads(data.threads || [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [channelFilter, pipelineFilter, setThreads, setLoading])

  const fetchMessages = useCallback(async (threadId: string) => {
    try {
      const res = await fetch(`/api/inbox/messages?thread_id=${threadId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch { /* ignore */ }
  }, [setMessages])

  useEffect(() => { fetchThreads() }, [fetchThreads])

  useEffect(() => {
    if (activeThread) fetchMessages(activeThread)
  }, [activeThread, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!reply.trim() || !activeThread) return
    setSending(true)
    const thread = threads.find((t) => t.id === activeThread)
    try {
      await fetch('/api/inbox/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: activeThread,
          channel: thread?.channel,
          contact_id: thread?.contact_id,
          content: reply.trim(),
        }),
      })
      setReply('')
      await fetchMessages(activeThread)
      await fetchThreads()
    } finally { setSending(false) }
  }

  const handlePipelineChange = async (threadId: string, stage: string) => {
    updateThread(threadId, { pipeline_stage: stage as InboxThread['pipeline_stage'] })
    await fetch('/api/inbox/threads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: threadId, pipeline_stage: stage }),
    })
  }

  const handlePin = async (threadId: string, pinned: boolean) => {
    updateThread(threadId, { is_pinned: !pinned })
    await fetch('/api/inbox/threads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: threadId, is_pinned: !pinned }),
    })
  }

  const filteredThreads = threads.filter((t) => {
    if (search) {
      const q = search.toLowerCase()
      return t.contact_name?.toLowerCase().includes(q) || t.last_message?.toLowerCase().includes(q)
    }
    return true
  })

  const currentThread = threads.find((t) => t.id === activeThread)
  const ChannelIcon = currentThread ? CHANNEL_ICONS[currentThread.channel] || InboxIcon : InboxIcon

  // Thread detail view (mobile full-screen or desktop right panel)
  if (activeThread && currentThread) {
    return (
      <PageWrapper className="py-0 !px-0 h-[calc(100vh-4.5rem)] flex flex-col">
        {/* Thread header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <button
            onClick={() => { setActiveThread(null); setMessages([]) }}
            className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${CHANNEL_COLORS[currentThread.channel] || '#888'}15` }}>
            <ChannelIcon className="h-4 w-4" style={{ color: CHANNEL_COLORS[currentThread.channel] || '#888' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{currentThread.contact_name || 'Sin nombre'}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{currentThread.channel}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePin(currentThread.id, currentThread.is_pinned)}
              className={cn('p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer transition-colors', currentThread.is_pinned && 'text-[#00D4FF]')}
            >
              <Pin className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowPipeline(!showPipeline)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                {PIPELINES.find((p) => p.id === currentThread.pipeline_stage)?.label || 'Pipeline'}
                <ChevronDown className="h-3 w-3" />
              </button>
              <AnimatePresence>
                {showPipeline && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-xl bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/[0.08] p-1"
                  >
                    {PIPELINES.filter((p) => p.id).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { handlePipelineChange(currentThread.id, p.id!); setShowPipeline(false) }}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer',
                          currentThread.pipeline_stage === p.id ? 'text-[#00D4FF] bg-white/[0.06]' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-hide">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} channel={currentThread.channel} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply input */}
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <div className="glass-card !rounded-2xl !p-0 flex items-end">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Escribe un mensaje..."
              rows={1}
              className="flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none max-h-[120px]"
            />
            <motion.button
              whileTap={tapBounce}
              onClick={handleSend}
              disabled={!reply.trim() || sending}
              className="p-3 text-[#00D4FF] disabled:text-muted-foreground/30 cursor-pointer transition-colors"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </motion.button>
          </div>
        </div>
      </PageWrapper>
    )
  }

  // Thread list view
  return (
    <PageWrapper className="py-4">
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">Inbox</h1>
            <p className="text-[11px] text-muted-foreground">
              {threads.reduce((sum, t) => sum + t.unread_count, 0)} sin leer
            </p>
          </div>
        </motion.div>

        {/* Channel filter pills */}
        <motion.div variants={fadeUp} className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-3 -mx-1 px-1">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon
            const active = channelFilter === ch.id
            return (
              <button
                key={ch.id || 'all'}
                onClick={() => setChannelFilter(ch.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium shrink-0 cursor-pointer transition-all border',
                  active
                    ? 'bg-white/[0.08] border-white/[0.1] text-[#00D4FF]'
                    : 'bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.05]'
                )}
              >
                <Icon className="h-3 w-3" style={ch.id ? { color: active ? undefined : (ch as { color?: string }).color } : {}} />
                {ch.label}
              </button>
            )
          })}
        </motion.div>

        {/* Pipeline filter */}
        <motion.div variants={fadeUp} className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4 -mx-1 px-1">
          {PIPELINES.map((p) => {
            const active = pipelineFilter === p.id
            return (
              <button
                key={p.id || 'all'}
                onClick={() => setPipelineFilter(p.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-medium shrink-0 cursor-pointer transition-all',
                  active
                    ? 'bg-[#00D4FF]/10 text-[#00D4FF]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p.label}
              </button>
            )
          })}
        </motion.div>

        {/* Search */}
        <motion.div variants={fadeUp} className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversaciones..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#00D4FF]/30 transition-colors"
            />
          </div>
        </motion.div>

        {/* Thread list */}
        <motion.div variants={fadeUp} className="space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <EmptyInbox />
          ) : (
            filteredThreads.map((thread) => (
              <ThreadRow
                key={thread.id}
                thread={thread}
                onClick={() => setActiveThread(thread.id)}
              />
            ))
          )}
        </motion.div>
      </motion.div>
    </PageWrapper>
  )
}

function ThreadRow({ thread, onClick }: { thread: InboxThread; onClick: () => void }) {
  const Icon = CHANNEL_ICONS[thread.channel] || InboxIcon
  const color = CHANNEL_COLORS[thread.channel] || '#888'

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3.5 py-3 rounded-2xl cursor-pointer transition-colors',
        thread.unread_count > 0 ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <div
          className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          {thread.contact_avatar ? (
            <img src={thread.contact_avatar} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            <span className="text-sm font-semibold" style={{ color }}>
              {(thread.contact_name || '?')[0].toUpperCase()}
            </span>
          )}
        </div>
        <div
          className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center border-2 border-background"
          style={{ backgroundColor: `${color}30` }}
        >
          <Icon className="h-2 w-2" style={{ color }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('text-sm truncate', thread.unread_count > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
            {thread.contact_name || 'Sin nombre'}
          </p>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatTime(thread.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn('text-[11px] truncate', thread.unread_count > 0 ? 'text-foreground/70' : 'text-muted-foreground')}>
            {thread.last_message || 'Sin mensajes'}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {thread.is_pinned && <Pin className="h-2.5 w-2.5 text-[#00D4FF]" />}
            {thread.unread_count > 0 && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-[#00D4FF] text-[9px] font-bold text-black flex items-center justify-center">
                {thread.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function MessageBubble({ message, channel }: { message: InboxMessage; channel: string }) {
  const isOutbound = message.direction === 'outbound'
  const time = message.external_timestamp || message.created_at

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[80%] px-3.5 py-2.5 rounded-[20px]',
        isOutbound
          ? 'bg-[#00D4FF] text-black rounded-br-md'
          : 'bg-white/[0.05] border border-white/[0.08] text-foreground rounded-bl-md'
      )}>
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <div className={cn('flex items-center justify-end gap-1 mt-1', isOutbound ? 'text-black/50' : 'text-muted-foreground/50')}>
          <span className="text-[9px]">{new Date(time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  )
}

function EmptyInbox() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
        <InboxIcon className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">Inbox vacío</h3>
      <p className="text-[11px] text-muted-foreground max-w-xs">
        Conecta WhatsApp, Gmail, Instagram o LinkedIn desde Agentes para ver tus conversaciones aquí.
      </p>
    </div>
  )
}
