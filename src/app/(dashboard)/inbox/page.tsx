'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  MessageCircle, Mail, Instagram, Linkedin, Search,
  ArrowLeft, Send, Pin, ChevronDown, ChevronRight,
  Loader2, Inbox as InboxIcon, Bot, FolderOpen, Plus,
  Trash2, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInboxStore, type InboxThread, type InboxMessage } from '@/stores/inboxStore'
import { useTaskStore } from '@/stores/taskStore'
import { fadeUp } from '@/lib/animations'
import { KiraLogo } from '@/components/shared/KiraLogo'

// Conversation type for KIRA chats
interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

type Section = 'kira' | 'messages' | 'projects'

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
  { id: 'gmail', label: 'Gmail', icon: Mail, color: '#EA4335' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
]

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: '#25D366', gmail: '#EA4335', instagram: '#E4405F', linkedin: '#0A66C2',
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageCircle, gmail: Mail, instagram: Instagram, linkedin: Linkedin,
}

const PIPELINE_LABELS: Record<string, string> = {
  new: 'Nuevo', replied: 'Respondido', follow_up: 'Follow up', closed: 'Cerrado',
}

function formatTime(iso: string | null) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.round(mins / 60)}h`
  return `${Math.round(mins / 1440)}d`
}

export default function InboxPage() {
  const router = useRouter()
  const {
    threads, messages, loading,
    activeThread, channelFilter,
    setThreads, setMessages, setLoading,
    setActiveThread, setChannelFilter, updateThread,
  } = useInboxStore()

  const projects = useTaskStore((s) => s.projects)
  const tasks = useTaskStore((s) => s.tasks)

  const [section, setSection] = useState<Section>('kira')
  const [search, setSearch] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convsLoading, setConvsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load KIRA conversations
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/ai/conversations')
        if (res.ok) {
          const data = await res.json()
          setConversations(data.conversations || [])
        }
      } catch { /* ignore */ }
      finally { setConvsLoading(false) }
    }
    load()
  }, [])

  // Load inbox threads
  const fetchThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (channelFilter) params.set('channel', channelFilter)
      const res = await fetch(`/api/inbox/threads?${params}`)
      if (res.ok) {
        const data = await res.json()
        setThreads(data.threads || [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [channelFilter, setThreads, setLoading])

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
  useEffect(() => { if (activeThread) fetchMessages(activeThread) }, [activeThread, fetchMessages])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async () => {
    if (!reply.trim() || !activeThread) return
    setSending(true)
    const thread = threads.find((t) => t.id === activeThread)
    try {
      await fetch('/api/inbox/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: activeThread, channel: thread?.channel, contact_id: thread?.contact_id, content: reply.trim() }),
      })
      setReply('')
      await fetchMessages(activeThread)
      await fetchThreads()
    } finally { setSending(false) }
  }

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch('/api/ai/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: convId }),
      })
      setConversations(prev => prev.filter(c => c.id !== convId))
    } catch { /* ignore */ }
  }

  const currentThread = threads.find((t) => t.id === activeThread)

  // --- Thread detail view ---
  if (activeThread && currentThread) {
    const ChannelIcon = CHANNEL_ICONS[currentThread.channel] || InboxIcon
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)] px-4">
        <div className="flex items-center gap-3 py-3">
          <button onClick={() => { setActiveThread(null); setMessages([]) }} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${CHANNEL_COLORS[currentThread.channel] || '#888'}15` }}>
            <ChannelIcon className="h-4 w-4" style={{ color: CHANNEL_COLORS[currentThread.channel] }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{currentThread.contact_name || 'Sin nombre'}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{currentThread.channel}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[80%] px-3.5 py-2.5 rounded-[20px]',
                msg.direction === 'outbound'
                  ? 'bg-[#00D4FF] text-black rounded-br-md'
                  : 'bg-white/[0.05] border border-white/[0.08] text-foreground rounded-bl-md'
              )}>
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p className={cn('text-[9px] text-right mt-1', msg.direction === 'outbound' ? 'text-black/40' : 'text-muted-foreground/40')}>
                  {new Date(msg.external_timestamp || msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="py-3">
          <div className="flex items-end gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] px-3 py-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Escribe..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none max-h-[100px]"
            />
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={!reply.trim() || sending} className="p-2 text-[#00D4FF] disabled:text-muted-foreground/30 cursor-pointer">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  // --- Main inbox view ---
  const filteredConvs = conversations.filter((c) => {
    if (!search) return true
    return c.title.toLowerCase().includes(search.toLowerCase())
  })

  const filteredThreads = threads.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.contact_name?.toLowerCase().includes(q) || t.last_message?.toLowerCase().includes(q)
  })

  return (
    <div className="px-4 py-4">
      {/* Section tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        {[
          { id: 'kira' as Section, label: 'KIRA', icon: Sparkles },
          { id: 'messages' as Section, label: 'Mensajes', icon: MessageCircle },
          { id: 'projects' as Section, label: 'Proyectos', icon: FolderOpen },
        ].map((tab) => {
          const Icon = tab.icon
          const active = section === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setSection(tab.id)}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer z-10',
                active ? 'text-[#00D4FF]' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {active && (
                <motion.div
                  layoutId="inbox-tab"
                  className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-xl"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#00D4FF]/20 transition-colors"
        />
      </div>

      {/* KIRA conversations */}
      {section === 'kira' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
          {/* New conversation button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/kira')}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.1)] hover:bg-[rgba(0,212,255,0.08)] transition-colors cursor-pointer mb-2"
          >
            <div className="h-10 w-10 rounded-xl bg-[rgba(0,212,255,0.08)] flex items-center justify-center">
              <Plus className="h-5 w-5 text-[#00D4FF]" />
            </div>
            <p className="text-[13px] font-medium text-[#00D4FF]">Nueva conversación</p>
          </motion.button>

          {convsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-12">
              <KiraLogo size="lg" className="mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Sin conversaciones con KIRA</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Toca + para empezar</p>
            </div>
          ) : filteredConvs.map((conv) => (
            <motion.div
              key={conv.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/kira?conv=${conv.id}`)}
              className="flex items-center gap-3 px-3.5 py-3 rounded-2xl hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              <div className="h-10 w-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                <KiraLogo size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-foreground truncate">{conv.title}</p>
                <p className="text-[10px] text-muted-foreground">{formatTime(conv.updated_at)}</p>
              </div>
              <button
                onClick={(e) => deleteConversation(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/20 transition-all cursor-pointer"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground/20" />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Messages from external channels */}
      {section === 'messages' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Channel filter */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setChannelFilter(null)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[10px] font-medium shrink-0 cursor-pointer transition-all',
                !channelFilter ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Todos
            </button>
            {CHANNELS.map((ch) => {
              const Icon = ch.icon
              return (
                <button
                  key={ch.id}
                  onClick={() => setChannelFilter(channelFilter === ch.id ? null : ch.id)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium shrink-0 cursor-pointer transition-all',
                    channelFilter === ch.id ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-3 w-3" style={{ color: ch.color }} />
                  {ch.label}
                </button>
              )
            })}
          </div>

          <div className="space-y-1">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : filteredThreads.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-14 w-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                  <InboxIcon className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">Sin mensajes</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Conecta WhatsApp, Gmail o Instagram desde Agentes</p>
              </div>
            ) : filteredThreads.map((thread) => {
              const Icon = CHANNEL_ICONS[thread.channel] || InboxIcon
              const color = CHANNEL_COLORS[thread.channel] || '#888'
              return (
                <motion.div
                  key={thread.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveThread(thread.id)}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-3 rounded-2xl cursor-pointer transition-colors',
                    thread.unread_count > 0 ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'
                  )}
                >
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                      <span className="text-sm font-semibold" style={{ color }}>{(thread.contact_name || '?')[0].toUpperCase()}</span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center border-2 border-background" style={{ backgroundColor: `${color}30` }}>
                      <Icon className="h-2 w-2" style={{ color }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn('text-[13px] truncate', thread.unread_count > 0 ? 'font-semibold text-foreground' : 'text-foreground')}>{thread.contact_name || 'Sin nombre'}</p>
                      <span className="text-[10px] text-muted-foreground/50 shrink-0 ml-2">{formatTime(thread.last_message_at)}</span>
                    </div>
                    <p className={cn('text-[11px] truncate', thread.unread_count > 0 ? 'text-foreground/60' : 'text-muted-foreground')}>{thread.last_message || '...'}</p>
                  </div>
                  {thread.unread_count > 0 && (
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#00D4FF] text-[9px] font-bold text-black flex items-center justify-center shrink-0">{thread.unread_count}</span>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Projects */}
      {section === 'projects' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-14 w-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                <FolderOpen className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">Sin proyectos</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Crea proyectos en Settings</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {projects.map((project) => {
                const projectTasks = tasks.filter(t => t.project_id === project.id && t.status !== 'deleted')
                const pendingCount = projectTasks.filter(t => t.status !== 'done').length
                const doneCount = projectTasks.filter(t => t.status === 'done').length
                const progress = projectTasks.length > 0 ? Math.round((doneCount / projectTasks.length) * 100) : 0

                return (
                  <motion.div
                    key={project.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => router.push(`/kira?conv=new&project=${project.name}`)}
                    className="glass-card !rounded-2xl p-4 cursor-pointer"
                  >
                    <div className="h-10 w-10 rounded-xl bg-[rgba(0,212,255,0.06)] flex items-center justify-center mb-3">
                      <FolderOpen className="h-5 w-5 text-[#00D4FF]" />
                    </div>
                    <p className="text-[13px] font-semibold text-foreground truncate mb-1">{project.name}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-muted-foreground">{pendingCount} pending</span>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-emerald-400/60">{doneCount} done</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[#00D4FF]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
