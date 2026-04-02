'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, CheckCircle2, AlertCircle, Plus, MessageSquare, Trash2, X } from 'lucide-react'
import { KiraLogo } from '@/components/shared/KiraLogo'
import { cn } from '@/lib/utils'
import { useTasks } from '@/lib/hooks/useTasks'
import { useTaskStore } from '@/stores/taskStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { useMeetings } from '@/lib/hooks/useMeetings'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  actions?: Array<{ action: string; success: boolean; id?: string; error?: string }>
}

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

const SUGGESTIONS = [
  'Buenos días, KIRA',
  '¿Qué tengo pendiente?',
  'Créame una task urgente',
  'Agenda una reunión',
  '¿Mis prioridades?',
]

export function KiraChat() {
  const { refetch: refetchTasks } = useTasks()
  const { refetch: refetchMeetings } = useMeetings()

  const tasks = useTaskStore((s) => s.tasks)
  const categories = useTaskStore((s) => s.categories)
  const projects = useTaskStore((s) => s.projects)
  const tags = useTaskStore((s) => s.tags)
  const meetings = useMeetingStore((s) => s.meetings)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showSidebar, setShowSidebar] = useState(false)
  const [showMobileHistory, setShowMobileHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages])

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/conversations')
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/ai/conversations')
        if (!res.ok) return
        const data = await res.json()
        const convs = data.conversations || []
        setConversations(convs)
        if (convs.length > 0) {
          await loadConversation(convs[0].id)
        }
      } catch { /* ignore */ }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { inputRef.current?.focus() }, [])

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/ai/conversations?id=${convId}`)
      if (!res.ok) return
      const data = await res.json()
      const loadedMessages: ChatMessage[] = (data.messages || []).map((m: { role: string; content: string; actions_executed?: unknown[] }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        actions: m.actions_executed as ChatMessage['actions'],
      }))
      setMessages(loadedMessages)
      setConversationId(convId)
      setShowSidebar(false)
      setShowMobileHistory(false)
    } catch { /* ignore */ }
  }

  const newConversation = () => {
    setMessages([])
    setConversationId(null)
    setShowSidebar(false)
    setShowMobileHistory(false)
    inputRef.current?.focus()
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
      if (conversationId === convId) newConversation()
    } catch { /* ignore */ }
  }

  const buildContext = () => ({
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
  })

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    const userMessage: ChatMessage = { role: 'user', content: messageText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const chatHistory = newMessages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory, context: buildContext(), conversationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
        loadConversations()
      }

      setMessages(prev => [...prev, {
        role: 'assistant', content: data.message, actions: data.actions,
      }])

      if (data.actions?.length > 0) { refetchTasks(); refetchMeetings() }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err instanceof Error ? `Error: ${err.message}` : 'Error al comunicarme. Inténtalo de nuevo.',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create_task: 'Task creada', edit_task: 'Task actualizada', delete_task: 'Task eliminada',
      create_meeting: 'Meeting creado', edit_meeting: 'Meeting actualizado', delete_meeting: 'Meeting cancelado',
      save_memory: 'Memoria guardada', delete_memory: 'Memoria eliminada',
      create_calendar_event: 'Evento añadido a Google Calendar',
      update_calendar_event: 'Evento de Google Calendar actualizado',
      delete_calendar_event: 'Evento eliminado de Google Calendar',
      create_category: 'Categoría creada', create_project: 'Proyecto creado',
    }
    return labels[action] || action
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `hace ${mins}min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `hace ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `hace ${days}d`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const ConversationList = () => (
    <div className="overflow-y-auto flex-1">
      {conversations.length === 0 ? (
        <p className="text-[11px] text-muted-foreground p-3">Sin conversaciones</p>
      ) : (
        conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => loadConversation(conv.id)}
            className={cn(
              'group flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/[0.04]',
              conversationId === conv.id && 'bg-white/[0.06]'
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate">{conv.title}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(conv.updated_at)}</p>
            </div>
            <button
              onClick={(e) => deleteConversation(conv.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 transition-all cursor-pointer"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))
      )}
    </div>
  )

  return (
    <div className="flex gap-0 md:gap-4 h-full">
      {/* Desktop sidebar */}
      <div className={cn(
        'hidden md:flex shrink-0 flex-col glass-card overflow-hidden transition-all',
        showSidebar ? 'w-64' : 'w-12'
      )}>
        <div className="p-2 border-b border-white/[0.06] flex items-center gap-2">
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer" title="Conversaciones">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </button>
          {showSidebar && (
            <>
              <span className="text-xs font-medium text-muted-foreground flex-1">Historial</span>
              <button onClick={newConversation} className="p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer" title="Nueva conversación">
                <Plus className="h-4 w-4 text-[#00D4FF]" />
              </button>
            </>
          )}
        </div>
        {showSidebar && <ConversationList />}
        {!showSidebar && (
          <div className="flex-1 flex flex-col items-center pt-2 gap-2">
            <button onClick={newConversation} className="p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer" title="Nueva conversación">
              <Plus className="h-4 w-4 text-[#00D4FF]" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile history overlay */}
      <AnimatePresence>
        {showMobileHistory && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 z-[180] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileHistory(false)}
            />
            <motion.div
              className="md:hidden fixed bottom-0 left-0 right-0 z-[181] max-h-[70vh] glass-elevated flex flex-col"
              style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
            >
              <div className="flex justify-center pt-2"><div className="w-8 h-1 rounded-full bg-white/10" /></div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <span className="text-sm font-medium">Conversaciones</span>
                <div className="flex items-center gap-2">
                  <button onClick={newConversation} className="p-1.5 rounded-xl hover:bg-white/[0.06] cursor-pointer"><Plus className="h-4 w-4 text-[#00D4FF]" /></button>
                  <button onClick={() => setShowMobileHistory(false)} className="p-1.5 rounded-xl hover:bg-white/[0.06] cursor-pointer"><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
              </div>
              <ConversationList />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile action bar */}
        <div className="flex md:hidden items-center gap-2 mb-3">
          <motion.button
            onClick={() => setShowMobileHistory(true)}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-muted-foreground cursor-pointer backdrop-blur-sm"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Historial
          </motion.button>
          <motion.button
            onClick={newConversation}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.15)] text-xs text-[#00D4FF] cursor-pointer backdrop-blur-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva
          </motion.button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4 min-h-0 md:glass-card">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <motion.div
                className="mb-4"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring' as const, stiffness: 200, damping: 20 }}
              >
                <KiraLogo size="lg" />
              </motion.div>
              <h2 className="text-sm font-semibold text-foreground mb-1">Hola, soy KIRA</h2>
              <p className="text-xs text-muted-foreground mb-5 max-w-sm">
                Puedo crear tasks, meetings, proyectos, categorías, gestionar tu Google Calendar y recordar cosas sobre ti.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={i}
                    onClick={() => sendMessage(s)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-[11px] px-3.5 py-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:text-foreground hover:border-[#00D4FF]/30 hover:bg-white/[0.06] transition-all cursor-pointer backdrop-blur-sm"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  initial={{ opacity: 0, y: 8, x: msg.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    className={cn(
                      'max-w-[85%] md:max-w-[70%] text-[13px] leading-relaxed',
                      msg.role === 'user'
                        ? 'rounded-[20px] rounded-br-lg bg-[#00D4FF] text-black px-4 py-3'
                        : 'rounded-[20px] rounded-bl-lg px-4 py-3 bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm text-foreground'
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className={cn(
                        'mt-2.5 space-y-1.5 pt-2.5',
                        msg.role === 'user' ? 'border-t border-black/10' : 'border-t border-white/[0.08]'
                      )}>
                        {msg.actions.map((act, j) => (
                          <div key={j} className="flex items-center gap-1.5 text-[11px]">
                            {act.success ? (
                              <CheckCircle2 className={cn('h-3 w-3 shrink-0', msg.role === 'user' ? 'text-emerald-700' : 'text-emerald-400')} />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                            )}
                            <span className={cn(
                              act.success
                                ? (msg.role === 'user' ? 'opacity-80' : 'text-muted-foreground')
                                : 'text-red-400'
                            )}>
                              {actionLabel(act.action)}
                              {!act.success && act.error ? `: ${act.error}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="rounded-[20px] rounded-bl-lg px-4 py-3 bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm">
                    <div className="flex items-center gap-2.5">
                      <motion.div
                        className="h-2 w-2 rounded-full bg-[#00D4FF]"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span className="text-xs text-muted-foreground">KIRA está pensando...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="mt-3 pb-[env(safe-area-inset-bottom)]">
          <div className="relative glass-card !rounded-2xl overflow-hidden !p-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escríbele a KIRA..."
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-3.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              style={{ minHeight: '48px', maxHeight: '120px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = '48px'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />
            <motion.button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              whileTap={{ scale: 0.9 }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-[#00D4FF] text-black flex items-center justify-center disabled:opacity-20 cursor-pointer transition-opacity"
            >
              <Send className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
