'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, CheckCircle2, AlertCircle, Plus, MessageSquare, Trash2,
  X, ArrowLeft, Bot, FolderOpen, ChevronRight
} from 'lucide-react'
import { KiraLogo } from '@/components/shared/KiraLogo'
import { KiraAgents } from '@/components/kira/KiraAgents'
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
]

type ViewMode = 'chat' | 'conversations' | 'agents' | 'projects'

export function KiraChat({ initialConversationId, initialTab }: { initialConversationId?: string | null; initialTab?: string | null }) {
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
  const [view, setView] = useState<ViewMode>(initialTab === 'agents' ? 'agents' : 'chat')
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
      await loadConversations()
      const convs = await fetch('/api/ai/conversations').then(r => r.json()).then(d => d.conversations || []).catch(() => [])
      setConversations(convs)

      // Load specific conversation if provided
      if (initialConversationId) {
        await loadConversation(initialConversationId)
      } else if (convs.length > 0 && initialTab !== 'agents') {
        await loadConversation(convs[0].id)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { inputRef.current?.focus() }, [view])

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
      setView('chat')
    } catch { /* ignore */ }
  }

  const newConversation = () => {
    setMessages([])
    setConversationId(null)
    setView('chat')
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
      create_task: 'Task creada', edit_task: 'Task editada', delete_task: 'Task eliminada',
      create_meeting: 'Meeting creado', edit_meeting: 'Meeting editado', delete_meeting: 'Meeting cancelado',
      save_memory: 'Memoria guardada', delete_memory: 'Memoria eliminada',
      create_calendar_event: 'Evento de calendario creado',
      update_calendar_event: 'Evento actualizado',
      delete_calendar_event: 'Evento eliminado',
      create_category: 'Categoría creada', create_project: 'Proyecto creado',
    }
    return labels[action] || action
  }

  const formatDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  // --- Conversations view ---
  if (view === 'conversations') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setView('chat')} className="text-muted-foreground hover:text-foreground cursor-pointer"><ArrowLeft className="h-5 w-5" /></button>
            <h2 className="text-sm font-semibold text-foreground">Conversaciones</h2>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={newConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00D4FF] text-black text-xs font-medium cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva
          </motion.button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
          {conversations.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Sin conversaciones</p>
          ) : conversations.map((conv) => (
            <motion.div
              key={conv.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => loadConversation(conv.id)}
              className={cn(
                'flex items-center gap-3 px-3.5 py-3 rounded-2xl cursor-pointer transition-colors group',
                conversationId === conv.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
              )}
            >
              <div className="h-9 w-9 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4 text-muted-foreground/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-foreground truncate">{conv.title}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(conv.updated_at)}</p>
              </div>
              <button
                onClick={(e) => deleteConversation(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/20 transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground/20" />
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  // --- Agents view ---
  if (view === 'agents') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setView('chat')} className="text-muted-foreground hover:text-foreground cursor-pointer"><ArrowLeft className="h-5 w-5" /></button>
          <h2 className="text-sm font-semibold text-foreground">Agentes</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <KiraAgents />
        </div>
      </div>
    )
  }

  // --- Projects view ---
  if (view === 'projects') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setView('chat')} className="text-muted-foreground hover:text-foreground cursor-pointer"><ArrowLeft className="h-5 w-5" /></button>
          <h2 className="text-sm font-semibold text-foreground">Proyectos</h2>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {projects.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Sin proyectos</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {projects.map((project) => {
                const projectTasks = tasks.filter(t => t.project_id === project.id && t.status !== 'deleted')
                const done = projectTasks.filter(t => t.status === 'done').length
                return (
                  <motion.div
                    key={project.id}
                    whileTap={{ scale: 0.97 }}
                    className="glass-card !rounded-2xl p-4 cursor-pointer"
                    onClick={() => {
                      // Start a conversation in project context
                      setMessages([])
                      setConversationId(null)
                      setInput(`Hablemos sobre el proyecto "${project.name}"`)
                      setView('chat')
                    }}
                  >
                    <div className="h-10 w-10 rounded-xl bg-white/[0.06] flex items-center justify-center mb-3">
                      <FolderOpen className="h-5 w-5 text-[#00D4FF]" />
                    </div>
                    <p className="text-[13px] font-semibold text-foreground truncate">{project.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {projectTasks.length} tasks · {done} done
                    </p>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Chat view (main) ---
  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto scrollbar-hide">
        {[
          { id: 'conversations' as ViewMode, label: 'Conversaciones', icon: MessageSquare },
          { id: 'projects' as ViewMode, label: 'Proyectos', icon: FolderOpen },
          { id: 'agents' as ViewMode, label: 'Agentes', icon: Bot },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer shrink-0"
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          )
        })}
        <div className="flex-1" />
        <button
          onClick={newConversation}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-[#00D4FF] hover:bg-[rgba(0,212,255,0.06)] transition-colors cursor-pointer shrink-0"
        >
          <Plus className="h-3 w-3" />
          Nueva
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <motion.div
              className="mb-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <KiraLogo size="lg" />
            </motion.div>
            <h2 className="text-sm font-semibold text-foreground mb-1">Hola, soy KIRA</h2>
            <p className="text-xs text-muted-foreground mb-5 max-w-sm">
              Puedo gestionar tasks, meetings, calendario, y recordar cosas sobre ti.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={i}
                  onClick={() => sendMessage(s)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-[11px] px-3 py-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:text-foreground hover:border-[#00D4FF]/30 transition-all cursor-pointer"
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
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div
                  className={cn(
                    'max-w-[85%] md:max-w-[70%] text-[13px] leading-relaxed px-4 py-3',
                    msg.role === 'user'
                      ? 'rounded-[20px] rounded-br-md bg-[#00D4FF] text-black'
                      : 'rounded-[20px] rounded-bl-md bg-white/[0.05] border border-white/[0.08] text-foreground'
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  {msg.actions && msg.actions.length > 0 && (
                    <div className={cn('mt-2 space-y-1 pt-2', msg.role === 'user' ? 'border-t border-black/10' : 'border-t border-white/[0.08]')}>
                      {msg.actions.map((act, j) => (
                        <div key={j} className="flex items-center gap-1.5 text-[11px]">
                          {act.success ? (
                            <CheckCircle2 className={cn('h-3 w-3 shrink-0', msg.role === 'user' ? 'text-emerald-700' : 'text-emerald-400')} />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                          )}
                          <span className={act.success ? (msg.role === 'user' ? 'opacity-80' : 'text-muted-foreground') : 'text-red-400'}>
                            {actionLabel(act.action)}{!act.success && act.error ? `: ${act.error}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {loading && (
              <motion.div className="flex justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="rounded-[20px] rounded-bl-md px-4 py-3 bg-white/[0.05] border border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      className="h-2 w-2 rounded-full bg-[#00D4FF]"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-xs text-muted-foreground">Pensando...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="mt-3 pb-1">
        <div className="relative rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escríbele a KIRA..."
            rows={1}
            className="w-full resize-none bg-transparent px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = '44px'
              target.style.height = Math.min(target.scrollHeight, 120) + 'px'
            }}
          />
          <motion.button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            whileTap={{ scale: 0.9 }}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-[#00D4FF] text-black flex items-center justify-center disabled:opacity-20 cursor-pointer transition-opacity"
          >
            <Send className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
