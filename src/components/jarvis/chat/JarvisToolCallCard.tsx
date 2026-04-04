'use client'

import { motion } from 'framer-motion'
import { Wrench, Check, X, Loader2 } from 'lucide-react'
import type { JarvisToolCall } from '@/types/jarvis'

export function JarvisToolCallCard({ toolCall }: { toolCall: JarvisToolCall }) {
  const statusIcon = {
    running: <Loader2 size={12} className="animate-spin text-[#00D4FF]" />,
    success: <Check size={12} className="text-emerald-400" />,
    error: <X size={12} className="text-red-400" />,
  }[toolCall.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs my-1.5"
    >
      <Wrench size={12} className="text-[#00D4FF] shrink-0" />
      <span className="text-foreground/80 font-mono truncate">{toolCall.tool}</span>
      {toolCall.latency != null && (
        <span className="text-muted-foreground ml-auto shrink-0">
          {(toolCall.latency / 1000).toFixed(1)}s
        </span>
      )}
      <span className="shrink-0">{statusIcon}</span>
    </motion.div>
  )
}
