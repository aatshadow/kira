'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Square } from 'lucide-react'
import { useJarvisStore, generateId } from '@/stores/jarvisStore'
import { streamJarvisChat } from '@/lib/jarvis/sse'
import { fetchJarvisSavings, syncTelemetry } from '@/lib/jarvis/api'
import type { JarvisMessage, JarvisToolCall, JarvisTokenUsage, JarvisTelemetry } from '@/types/jarvis'

export function JarvisInputArea() {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeId = useJarvisStore((s) => s.activeId)
  const selectedModel = useJarvisStore((s) => s.selectedModel)
  const streamState = useJarvisStore((s) => s.streamState)
  const maxTokens = useJarvisStore((s) => s.settings.maxTokens)
  const temperature = useJarvisStore((s) => s.settings.temperature)
  const createConversation = useJarvisStore((s) => s.createConversation)
  const addMessage = useJarvisStore((s) => s.addMessage)
  const updateLastAssistant = useJarvisStore((s) => s.updateLastAssistant)
  const setStreamState = useJarvisStore((s) => s.setStreamState)
  const resetStream = useJarvisStore((s) => s.resetStream)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    resetStream()
  }, [resetStream])

  const sendMessage = useCallback(async () => {
    const content = input.trim()
    if (!content || streamState.isStreaming) return
    setInput('')

    let convId = activeId
    if (!convId) convId = createConversation(selectedModel)

    const userMsg: JarvisMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    addMessage(convId, userMsg)

    const currentMessages = useJarvisStore.getState().messages
    const apiMessages = currentMessages.map((m) => ({ role: m.role, content: m.content }))

    const assistantMsg: JarvisMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }
    addMessage(convId, assistantMsg)

    const startTime = Date.now()
    const timer = setInterval(() => {
      setStreamState({ elapsedMs: Date.now() - startTime })
    }, 100)
    timerRef.current = timer

    const controller = new AbortController()
    abortRef.current = controller

    let accumulatedContent = ''
    let usage: JarvisTokenUsage | undefined
    let complexity: { score: number; tier: string; suggested_max_tokens: number } | undefined
    const toolCalls: JarvisToolCall[] = []
    let lastFlush = 0
    let ttftMs: number | undefined

    setStreamState({
      isStreaming: true,
      phase: 'Generating...',
      elapsedMs: 0,
      activeToolCalls: [],
      content: '',
    })

    try {
      for await (const sseEvent of streamJarvisChat(
        { model: selectedModel, messages: apiMessages, stream: true, temperature, max_tokens: maxTokens },
        controller.signal,
      )) {
        const eventName = sseEvent.event

        if (eventName === 'agent_turn_start') {
          setStreamState({ phase: 'Agent thinking...' })
        } else if (eventName === 'inference_start') {
          setStreamState({ phase: 'Generating...' })
        } else if (eventName === 'tool_call_start') {
          try {
            const data = JSON.parse(sseEvent.data)
            const tc: JarvisToolCall = {
              id: generateId(),
              tool: data.tool,
              arguments: data.arguments || '',
              status: 'running',
            }
            toolCalls.push(tc)
            setStreamState({ phase: `Calling ${data.tool}...`, activeToolCalls: [...toolCalls] })
            updateLastAssistant(convId, accumulatedContent, [...toolCalls])
          } catch { /* ignore parse errors */ }
        } else if (eventName === 'tool_call_end') {
          try {
            const data = JSON.parse(sseEvent.data)
            const tc = toolCalls.find((t) => t.tool === data.tool && t.status === 'running')
            if (tc) {
              tc.status = data.success ? 'success' : 'error'
              tc.latency = data.latency
              tc.result = data.result
            }
            setStreamState({ phase: 'Generating...', activeToolCalls: [...toolCalls] })
            updateLastAssistant(convId, accumulatedContent, [...toolCalls])
          } catch { /* ignore */ }
        } else {
          try {
            const data = JSON.parse(sseEvent.data)
            const delta = data.choices?.[0]?.delta
            if (data.usage) usage = data.usage
            if (data.complexity) complexity = data.complexity
            if (delta?.content) {
              if (!ttftMs) ttftMs = Date.now() - startTime
              accumulatedContent += delta.content
              setStreamState({ content: accumulatedContent, phase: '' })

              const now = Date.now()
              if (now - lastFlush >= 80) {
                updateLastAssistant(
                  convId,
                  accumulatedContent,
                  toolCalls.length > 0 ? [...toolCalls] : undefined,
                )
                lastFlush = now
              }
            }
            if (data.choices?.[0]?.finish_reason === 'stop') break
          } catch { /* ignore */ }
        }
      }
    } catch (err: unknown) {
      const error = err as Error
      if (error.name === 'AbortError') {
        if (!accumulatedContent) accumulatedContent = '(Generation stopped)'
      } else {
        accumulatedContent = accumulatedContent || `Error: ${error?.message || String(err)}`
      }
    } finally {
      if (!accumulatedContent) accumulatedContent = 'No response was generated. Please try again.'

      const totalMs = Date.now() - startTime
      const telemetry: JarvisTelemetry = {
        engine: selectedModel.startsWith('gpt-') || selectedModel.startsWith('claude-') || selectedModel.startsWith('gemini-') ? 'cloud' : 'local',
        model_id: selectedModel,
        total_ms: totalMs,
        ttft_ms: ttftMs,
        tokens_per_sec: usage?.completion_tokens ? usage.completion_tokens / (totalMs / 1000) : undefined,
        complexity_score: complexity?.score,
        complexity_tier: complexity?.tier,
        suggested_max_tokens: complexity?.suggested_max_tokens,
      }

      updateLastAssistant(
        convId,
        accumulatedContent,
        toolCalls.length > 0 ? toolCalls : undefined,
        usage,
        telemetry,
      )

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      resetStream()
      abortRef.current = null

      // Sync telemetry to Supabase
      if (usage) {
        syncTelemetry({
          model_id: selectedModel,
          engine: telemetry.engine,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          latency_seconds: totalMs / 1000,
          ttft: ttftMs ? ttftMs / 1000 : 0,
          tokens_per_sec: telemetry.tokens_per_sec || 0,
        }).catch(() => {})
      }

      fetchJarvisSavings()
        .then((data) => useJarvisStore.getState().setSavings(data))
        .catch(() => {})
    }
  }, [input, activeId, selectedModel, streamState.isStreaming, createConversation, addMessage, updateLastAssistant, setStreamState, resetStream, maxTokens, temperature])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="px-4 pb-4 pt-2 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-white/[0.04] border border-white/[0.08] transition-all focus-within:border-[#00D4FF]/30 focus-within:shadow-[0_0_12px_rgba(0,212,255,0.08)]">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Jarvis..."
          rows={1}
          className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50"
          style={{ maxHeight: '200px' }}
          disabled={streamState.isStreaming}
        />
        {streamState.isStreaming ? (
          <button
            onClick={stopStreaming}
            className="p-2 rounded-xl bg-red-500/80 text-white shrink-0 cursor-pointer hover:bg-red-500 transition-colors"
            title="Stop generating"
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="p-2 rounded-xl shrink-0 cursor-pointer disabled:opacity-20 disabled:cursor-default transition-all"
            style={{
              background: input.trim() ? '#00D4FF' : 'rgba(255,255,255,0.06)',
              color: input.trim() ? '#000' : 'rgba(255,255,255,0.3)',
            }}
            title="Send message"
          >
            <Send size={16} />
          </button>
        )}
      </div>
      <div className="flex items-center justify-center mt-2 text-[10px] text-muted-foreground/40">
        <kbd className="font-mono">Enter</kbd>&nbsp;to send &middot;&nbsp;
        <kbd className="font-mono">Shift+Enter</kbd>&nbsp;for new line
      </div>
    </div>
  )
}
