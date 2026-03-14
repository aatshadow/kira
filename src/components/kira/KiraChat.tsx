'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, CheckCircle2, AlertCircle, Plus, MessageSquare, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
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
  '¿Qué tengo pendiente para hoy?',
  'Créame una task urgente para mañana',
  'Agenda una reunión el viernes a las 10',
  '¿Cuáles son mis prioridades?',
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/conversations')
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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
    } catch {
      // ignore
    }
  }

  const newConversation = () => {
    setMessages([])
    setConversationId(null)
    setShowSidebar(false)
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
      if (conversationId === convId) {
        newConversation()
      }
    } catch {
      // ignore
    }
  }

  const buildContext = () => ({
    tasks: tasks.filter(t => t.status !== 'deleted').map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      category: categories.find(c => c.id === t.category_id)?.name || null,
      project: projects.find(p => p.id === t.project_id)?.name || null,
      due_date: t.due_date,
      estimated_mins: t.estimated_mins,
      tags: t.tags || [],
    })),
    meetings: meetings.map(m => ({
      id: m.id,
      title: m.title,
      status: m.status,
      scheduled_at: m.scheduled_at,
      duration_mins: m.duration_mins,
      participants: m.participants,
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
        body: JSON.stringify({
          messages: chatHistory,
          context: buildContext(),
          conversationId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
        loadConversations()
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        actions: data.actions,
      }

      setMessages(prev => [...prev, assistantMessage])

      if (data.actions && data.actions.length > 0) {
        refetchTasks()
        refetchMeetings()
      }
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create_task: 'Task creada',
      edit_task: 'Task actualizada',
      delete_task: 'Task eliminada',
      create_meeting: 'Meeting creado',
      edit_meeting: 'Meeting actualizado',
      delete_meeting: 'Meeting cancelado',
      save_memory: 'Memoria guardada',
      delete_memory: 'Memoria eliminada',
      create_calendar_event: 'Evento añadido a Google Calendar',
    }
    return labels[action] || action
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `hace ${mins}min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `hace ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `hace ${days}d`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Sidebar - conversations */}
      <div className={cn(
        'shrink-0 flex flex-col border border-border rounded-lg bg-card/50 overflow-hidden transition-all',
        showSidebar ? 'w-64' : 'w-12'
      )}>
        <div className="p-2 border-b border-border flex items-center gap-2">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors cursor-pointer"
            title="Conversaciones"
          >
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </button>
          {showSidebar && (
            <>
              <span className="text-xs font-medium text-muted-foreground flex-1">Historial</span>
              <button
                onClick={newConversation}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors cursor-pointer"
                title="Nueva conversación"
              >
                <Plus className="h-4 w-4 text-[#00D4FF]" />
              </button>
            </>
          )}
        </div>

        {showSidebar && (
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-[11px] text-muted-foreground p-3">Sin conversaciones</p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={cn(
                    'group flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-secondary/50 transition-colors border-b border-border/30',
                    conversationId === conv.id && 'bg-secondary/70'
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
        )}

        {!showSidebar && (
          <div className="flex-1 flex flex-col items-center pt-2 gap-2">
            <button
              onClick={newConversation}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors cursor-pointer"
              title="Nueva conversación"
            >
              <Plus className="h-4 w-4 text-[#00D4FF]" />
            </button>
          </div>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card/50 p-4 space-y-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Image src="/logo.png" alt="KIRA" width={64} height={64} className="rounded-2xl mb-4 opacity-60" />
              <h2 className="text-sm font-medium text-foreground mb-1">Hola, soy KIRA</h2>
              <p className="text-xs text-muted-foreground mb-6 max-w-sm">
                Puedo crear tasks, agendar meetings, consultar tu backlog, recordar cosas sobre ti y ayudarte a organizar tu día.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-[#00D4FF]/30 transition-colors cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <Image src="/logo.png" alt="KIRA" width={24} height={24} className="rounded-full mr-2 mt-1 shrink-0" />
                  )}
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'bg-[#00D4FF] text-black rounded-br-md'
                        : 'bg-secondary text-foreground rounded-bl-md'
                    )}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2 space-y-1 pt-2 border-t border-black/10">
                        {msg.actions.map((act, j) => (
                          <div key={j} className="flex items-center gap-1.5 text-[11px]">
                            {act.success ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                            )}
                            <span className={act.success ? 'opacity-80' : 'text-red-600'}>
                              {actionLabel(act.action)}
                              {!act.success && act.error ? `: ${act.error}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <Image src="/logo.png" alt="KIRA" width={24} height={24} className="rounded-full mr-2 mt-1 shrink-0 opacity-60" />
                  <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00D4FF]" />
                      <span className="text-xs text-muted-foreground">KIRA está pensando...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="mt-3 flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escríbele a KIRA..."
              rows={1}
              className="w-full resize-none rounded-xl border border-border bg-secondary px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#00D4FF]/50 focus:border-[#00D4FF]/50"
              style={{ minHeight: '48px', maxHeight: '120px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = '48px'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-[#00D4FF] text-black hover:bg-[#00A8CC] disabled:opacity-30"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
