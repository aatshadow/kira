'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
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
  timestamp: Date
}

const SUGGESTIONS = [
  'Créame una task para revisar el informe financiero, urgente, para mañana',
  '¿Qué tengo pendiente para hoy?',
  'Agenda una reunión con el equipo el viernes a las 10, una hora',
  '¿Cuáles son mis tasks más urgentes?',
  'Muéveme todas las tasks de backlog a to-do',
]

export default function KiraPage() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const context = {
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
      }

      const chatHistory = newMessages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory, context }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        actions: data.actions,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      // If actions were executed, refresh data
      if (data.actions && data.actions.length > 0) {
        refetchTasks()
        refetchMeetings()
      }
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: err instanceof Error ? `Error: ${err.message}` : 'Error al comunicarme. Inténtalo de nuevo.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
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
    }
    return labels[action] || action
  }

  return (
    <div className="py-8 flex flex-col" style={{ height: 'calc(100vh - 3.5rem - 5rem)' }}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-[#00D4FF]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">KIRA</h1>
            <p className="text-[11px] text-muted-foreground">Tu asistente de productividad</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card/50 p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="h-16 w-16 rounded-2xl bg-[rgba(0,212,255,0.08)] flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-[#00D4FF]/60" />
            </div>
            <h2 className="text-sm font-medium text-foreground mb-1">Hola, soy KIRA</h2>
            <p className="text-xs text-muted-foreground mb-6 max-w-sm">
              Puedo crear tasks, agendar meetings, consultar tu backlog, y ayudarte a organizar tu día. Escríbeme lo que necesites.
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
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                    msg.role === 'user'
                      ? 'bg-[#00D4FF] text-black rounded-br-md'
                      : 'bg-secondary text-foreground rounded-bl-md'
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Action results */}
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
  )
}
