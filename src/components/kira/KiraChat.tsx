'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, CheckCircle2, AlertCircle, Plus, MessageSquare, Trash2,
  X, ArrowLeft, Bot, FolderOpen, ChevronRight, Globe, Code, Brain, Monitor, Loader2, Mail, Phone,
  Mic, MicOff, Volume2, VolumeX
} from 'lucide-react'
import { KiraLogo } from '@/components/shared/KiraLogo'
import { KiraAgents } from '@/components/kira/KiraAgents'
import { cn } from '@/lib/utils'
import { useTasks } from '@/lib/hooks/useTasks'
import { useTaskStore } from '@/stores/taskStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { useMeetings } from '@/lib/hooks/useMeetings'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  actions?: Array<{ action: string; success: boolean; id?: string; error?: string }>
  toolCalls?: Array<{ id: string; name: string; input?: Record<string, unknown>; result?: string; error?: boolean; loading?: boolean }>
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
  'Busca las últimas noticias de IA',
]

const TOOL_META: Record<string, { icon: typeof Globe; label: string; color: string }> = {
  web_search: { icon: Globe, label: 'Buscando en internet', color: '#00D4FF' },
  get_url_content: { icon: Globe, label: 'Leyendo página', color: '#8B5CF6' },
  execute_code: { icon: Code, label: 'Ejecutando código', color: '#10B981' },
  query_knowledge: { icon: Brain, label: 'Buscando en memoria', color: '#F59E0B' },
  check_mac_status: { icon: Monitor, label: 'Verificando Mac', color: '#6366F1' },
  delegate_to_mac: { icon: Monitor, label: 'Delegando a Mac', color: '#6366F1' },
  read_emails: { icon: Mail, label: 'Leyendo emails', color: '#EF4444' },
  read_email_content: { icon: Mail, label: 'Leyendo email completo', color: '#EF4444' },
  send_email: { icon: Mail, label: 'Enviando email', color: '#EF4444' },
  whatsapp_send: { icon: Phone, label: 'Enviando WhatsApp', color: '#25D366' },
  whatsapp_chats: { icon: Phone, label: 'Leyendo chats de WhatsApp', color: '#25D366' },
  whatsapp_messages: { icon: Phone, label: 'Leyendo mensajes de WhatsApp', color: '#25D366' },
  whatsapp_search_contacts: { icon: Phone, label: 'Buscando contactos WhatsApp', color: '#25D366' },
  whatsapp_status: { icon: Phone, label: 'Verificando WhatsApp', color: '#25D366' },
  manychat_search: { icon: MessageSquare, label: 'Buscando en ManyChat', color: '#E4405F' },
  manychat_send: { icon: MessageSquare, label: 'Enviando via ManyChat', color: '#E4405F' },
  manychat_subscriber_info: { icon: MessageSquare, label: 'Info suscriptor ManyChat', color: '#E4405F' },
  manychat_status: { icon: MessageSquare, label: 'Verificando ManyChat', color: '#E4405F' },
  linkedin_profile: { icon: Globe, label: 'Perfil LinkedIn', color: '#0A66C2' },
  linkedin_post: { icon: Globe, label: 'Publicando en LinkedIn', color: '#0A66C2' },
  linkedin_message: { icon: Globe, label: 'Enviando mensaje LinkedIn', color: '#0A66C2' },
  linkedin_status: { icon: Globe, label: 'Verificando LinkedIn', color: '#0A66C2' },
  self_code: { icon: Code, label: 'Codeando cambios en KIRA', color: '#10B981' },
}

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
  const [streamingText, setStreamingText] = useState('')
  const [activeToolCalls, setActiveToolCalls] = useState<ChatMessage['toolCalls']>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [view, setView] = useState<ViewMode>(initialTab === 'agents' ? 'agents' : 'chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // --- Voice state ---
  const [isListening, setIsListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false) // TTS auto-speak responses
  const [isSpeaking, setIsSpeaking] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages, streamingText, activeToolCalls])

  // --- Voice: Speech-to-Text ---
  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'es-ES'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript)
    }

    recognition.onend = () => {
      setIsListening(false)
      // Auto-send on voice stop if there's text
      const textarea = inputRef.current
      if (textarea && textarea.value.trim()) {
        setTimeout(() => {
          const finalText = textarea.value.trim()
          if (finalText) sendMessage(finalText)
        }, 300)
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // --- Voice: Text-to-Speech (ElevenLabs) ---
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const speakText = useCallback(async (text: string) => {
    if (!text.trim()) return

    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    setIsSpeaking(true)

    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        setIsSpeaking(false)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(url)
        audioRef.current = null
      }
      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(url)
        audioRef.current = null
      }

      await audio.play()
    } catch {
      setIsSpeaking(false)
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  // Auto-speak KIRA responses when voice mode is on
  useEffect(() => {
    if (!voiceEnabled) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role === 'assistant' && lastMsg.content && !loading) {
      speakText(lastMsg.content)
    }
  }, [messages, loading, voiceEnabled, speakText])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
      if (audioRef.current) audioRef.current.pause()
    }
  }, [])

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

        if (initialConversationId) {
          await loadConversation(initialConversationId)
        } else if (convs.length > 0 && initialTab !== 'agents') {
          await loadConversation(convs[0].id)
        }
      } catch (err) {
        console.error('[KIRA] Init error:', err)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { inputRef.current?.focus() }, [view])

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/ai/conversations?id=${convId}`)
      if (!res.ok) {
        console.warn('[KIRA] Failed to load conversation:', res.status)
        return
      }
      const data = await res.json()
      const rawMessages = data.messages || []
      console.log(`[KIRA] Loaded conversation ${convId}: ${rawMessages.length} messages`, rawMessages.slice(0, 2))

      const loadedMessages: ChatMessage[] = rawMessages
        .map((m: { role: string; content: string | null; actions_executed?: unknown[] }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content || '',
          actions: m.actions_executed as ChatMessage['actions'],
        }))
        .filter((m: ChatMessage) => m.content || (m.actions && m.actions.length > 0)) // keep messages with content or actions
      setMessages(loadedMessages)
      setConversationId(convId)
      setView('chat')
    } catch (err) {
      console.error('[KIRA] Error loading conversation:', err)
    }
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
    setStreamingText('')
    setActiveToolCalls([])

    try {
      const chatHistory = newMessages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory, context: buildContext(), conversationId }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Error de conexión' }))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')

      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedText = ''
      let accumulatedToolCalls: NonNullable<ChatMessage['toolCalls']> = []
      let finalActions: ChatMessage['actions'] = []
      let finalConvId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7)
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6))

              switch (eventType) {
                case 'text':
                  accumulatedText += data.text
                  setStreamingText(accumulatedText)
                  break

                case 'tool_start':
                  accumulatedToolCalls = [...accumulatedToolCalls, {
                    id: data.id,
                    name: data.name,
                    input: data.input,
                    loading: true,
                  }]
                  setActiveToolCalls([...accumulatedToolCalls])
                  break

                case 'tool_result':
                  accumulatedToolCalls = accumulatedToolCalls.map(tc =>
                    tc.id === data.id
                      ? { ...tc, result: data.result, error: data.error, loading: false }
                      : tc
                  )
                  setActiveToolCalls([...accumulatedToolCalls])
                  break

                case 'actions':
                  finalActions = data
                  break

                case 'done':
                  finalConvId = data.conversationId
                  break

                case 'error':
                  throw new Error(data.message)
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
                if (eventType === 'error' || parseErr.message.startsWith('Chat failed')) throw parseErr
              }
            }
            eventType = ''
          }
        }
      }

      // Finalize: add assistant message
      const displayText = accumulatedText.replace(/```kira-action\n[\s\S]*?```/g, '').trim()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: displayText,
        actions: finalActions,
        toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
      }])
      setStreamingText('')
      setActiveToolCalls([])

      if (finalConvId && !conversationId) {
        setConversationId(finalConvId)
        loadConversations()
      }

      if (finalActions && finalActions.length > 0) { refetchTasks(); refetchMeetings() }
    } catch (err) {
      setStreamingText('')
      setActiveToolCalls([])
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

  // --- Tool Call Card ---
  const ToolCallCard = ({ tc }: { tc: NonNullable<ChatMessage['toolCalls']>[number] }) => {
    const meta = TOOL_META[tc.name] || { icon: Bot, label: tc.name, color: '#888' }
    const Icon = meta.icon
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px]"
      >
        <div
          className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: `${meta.color}15` }}
        >
          {tc.loading ? (
            <Loader2 className="h-3 w-3 animate-spin" style={{ color: meta.color }} />
          ) : (
            <Icon className="h-3 w-3" style={{ color: meta.color }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-medium text-foreground/80">{meta.label}</span>
          {tc.input && 'query' in tc.input && tc.input.query ? (
            <span className="text-muted-foreground ml-1">— &quot;{String(tc.input.query).slice(0, 60)}&quot;</span>
          ) : null}
          {tc.input && 'url' in tc.input && tc.input.url ? (
            <span className="text-muted-foreground ml-1 truncate block">{String(tc.input.url).slice(0, 80)}</span>
          ) : null}
          {tc.input && 'to' in tc.input && tc.input.to ? (
            <span className="text-muted-foreground ml-1">— Para: {String(tc.input.to).slice(0, 60)}</span>
          ) : null}
          {tc.input && 'message_id' in tc.input ? (
            <span className="text-muted-foreground ml-1">— ID: {String(tc.input.message_id).slice(0, 20)}...</span>
          ) : null}
          {!tc.loading && tc.result && (
            <p className="text-muted-foreground/70 mt-1 line-clamp-2">{tc.result.slice(0, 200)}</p>
          )}
          {tc.error && (
            <p className="text-red-400/80 mt-1">{tc.result?.slice(0, 100)}</p>
          )}
        </div>
      </motion.div>
    )
  }

  // --- Message Bubble ---
  const MessageBubble = ({ msg }: { msg: ChatMessage }) => {
    const isUser = msg.role === 'user'
    return (
      <motion.div
        className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className={cn('max-w-[85%] md:max-w-[70%]', isUser ? '' : 'space-y-2')}>
          {/* Tool calls (before text for assistant) */}
          {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
            <div className="space-y-1.5">
              {msg.toolCalls.map((tc) => (
                <ToolCallCard key={tc.id} tc={tc} />
              ))}
            </div>
          )}

          {/* Text bubble */}
          {msg.content && (
            <div
              className={cn(
                'text-[13px] leading-relaxed px-4 py-3',
                isUser
                  ? 'rounded-[20px] rounded-br-md bg-[#00D4FF] text-black'
                  : 'rounded-[20px] rounded-bl-md bg-white/[0.05] border border-white/[0.08] text-foreground'
              )}
            >
              {isUser ? (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-pre:bg-black/20 prose-pre:rounded-lg prose-code:text-[#00D4FF] prose-a:text-[#00D4FF]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              )}

              {/* Action results */}
              {msg.actions && msg.actions.length > 0 && (
                <div className={cn('mt-2 space-y-1 pt-2', isUser ? 'border-t border-black/10' : 'border-t border-white/[0.08]')}>
                  {msg.actions.map((act, j) => (
                    <div key={j} className="flex items-center gap-1.5 text-[11px]">
                      {act.success ? (
                        <CheckCircle2 className={cn('h-3 w-3 shrink-0', isUser ? 'text-emerald-700' : 'text-emerald-400')} />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                      )}
                      <span className={act.success ? (isUser ? 'opacity-80' : 'text-muted-foreground') : 'text-red-400'}>
                        {actionLabel(act.action)}{!act.success && act.error ? `: ${act.error}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    )
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
  const streamDisplayText = streamingText.replace(/```kira-action\n[\s\S]*?```/g, '').trim()

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
        {/* Voice toggle */}
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all cursor-pointer shrink-0',
            voiceEnabled
              ? 'bg-[rgba(0,212,255,0.1)] text-[#00D4FF] border border-[rgba(0,212,255,0.25)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
          )}
        >
          {voiceEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
          {voiceEnabled ? 'Voice ON' : 'Voice'}
        </button>
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
        {messages.length === 0 && !loading ? (
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
              Puedo gestionar tasks, meetings, calendario, buscar en internet, ejecutar código, y recordar cosas sobre ti.
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
              <MessageBubble key={i} msg={msg} />
            ))}

            {/* Streaming state */}
            {loading && (
              <motion.div className="flex justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="max-w-[85%] md:max-w-[70%] space-y-2">
                  {/* Active tool calls */}
                  {activeToolCalls && activeToolCalls.length > 0 && (
                    <div className="space-y-1.5">
                      {activeToolCalls.map((tc) => (
                        <ToolCallCard key={tc.id} tc={tc} />
                      ))}
                    </div>
                  )}

                  {/* Streaming text or thinking indicator */}
                  {streamDisplayText ? (
                    <div className="rounded-[20px] rounded-bl-md px-4 py-3 bg-white/[0.05] border border-white/[0.08] text-[13px] leading-relaxed">
                      <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-pre:bg-black/20 prose-pre:rounded-lg prose-code:text-[#00D4FF] prose-a:text-[#00D4FF]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamDisplayText}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[20px] rounded-bl-md px-4 py-3 bg-white/[0.05] border border-white/[0.08]">
                      <div className="flex items-center gap-2.5">
                        <motion.div
                          className="h-2 w-2 rounded-full bg-[#00D4FF]"
                          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {activeToolCalls && activeToolCalls.length > 0 ? 'Procesando...' : 'Pensando...'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="mt-3 pb-1">
        {/* Speaking indicator */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.button
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onClick={stopSpeaking}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 mb-1.5 rounded-xl text-[11px] font-medium text-[#00D4FF] bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.15)] cursor-pointer"
            >
              <motion.div
                className="flex items-center gap-0.5"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="h-1.5 w-0.5 rounded-full bg-[#00D4FF]" />
                <span className="h-2.5 w-0.5 rounded-full bg-[#00D4FF]" />
                <span className="h-1.5 w-0.5 rounded-full bg-[#00D4FF]" />
                <span className="h-3 w-0.5 rounded-full bg-[#00D4FF]" />
                <span className="h-1.5 w-0.5 rounded-full bg-[#00D4FF]" />
              </motion.div>
              <span>KIRA hablando — toca para parar</span>
            </motion.button>
          )}
        </AnimatePresence>

        <div className="relative rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Escuchando...' : 'Escríbele a KIRA...'}
            rows={1}
            className="w-full resize-none bg-transparent px-4 py-3 pr-24 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = '44px'
              target.style.height = Math.min(target.scrollHeight, 120) + 'px'
            }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {/* Mic button */}
            <motion.button
              onClick={toggleListening}
              whileTap={{ scale: 0.9 }}
              className={cn(
                'h-8 w-8 rounded-xl flex items-center justify-center cursor-pointer transition-all',
                isListening
                  ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                  : 'bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.1]'
              )}
            >
              {isListening ? (
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <MicOff className="h-3.5 w-3.5" />
                </motion.div>
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </motion.button>

            {/* Send button */}
            <motion.button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              whileTap={{ scale: 0.9 }}
              className="h-8 w-8 rounded-xl bg-[#00D4FF] text-black flex items-center justify-center disabled:opacity-20 cursor-pointer transition-opacity"
            >
              <Send className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
