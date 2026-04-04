'use client'

import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, User, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { JarvisToolCallCard } from './JarvisToolCallCard'
import type { JarvisMessage } from '@/types/jarvis'

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

export const JarvisMessageBubble = memo(function JarvisMessageBubble({
  message,
}: {
  message: JarvisMessage
}) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const displayContent = isUser ? message.content : stripThinkTags(message.content)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 mb-5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={14} className="text-[#00D4FF]" />
        </div>
      )}

      <div className={`group relative max-w-[75%] ${isUser ? 'order-first' : ''}`}>
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2">
            {message.toolCalls.map((tc) => (
              <JarvisToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-foreground'
              : 'bg-white/[0.04] border border-white/[0.06] text-foreground/90'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{displayContent}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-pre:bg-white/[0.06] prose-pre:border prose-pre:border-white/[0.08] prose-pre:rounded-lg prose-code:text-[#00D4FF] prose-a:text-[#00D4FF]">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {displayContent}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Copy button */}
        {!isUser && displayContent && (
          <button
            onClick={handleCopy}
            className="absolute -bottom-5 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}

        {/* Telemetry footer */}
        {message.telemetry && (
          <div className="flex items-center gap-3 mt-1.5 px-1 text-[10px] text-muted-foreground/60">
            {message.telemetry.tokens_per_sec && (
              <span>{message.telemetry.tokens_per_sec.toFixed(1)} tok/s</span>
            )}
            {message.telemetry.ttft_ms && (
              <span>TTFT {message.telemetry.ttft_ms}ms</span>
            )}
            {message.usage && (
              <span>{message.usage.total_tokens} tokens</span>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
          <User size={14} className="text-muted-foreground" />
        </div>
      )}
    </motion.div>
  )
})
