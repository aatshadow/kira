'use client'

import { motion } from 'framer-motion'

export function JarvisStreamingDots({ phase }: { phase?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] max-w-fit">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
      {phase && (
        <span className="text-xs text-muted-foreground">{phase}</span>
      )}
    </div>
  )
}
