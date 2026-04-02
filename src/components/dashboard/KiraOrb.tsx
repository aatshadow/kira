'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { KiraLogo } from '@/components/shared/KiraLogo'

export function KiraOrb() {
  const router = useRouter()

  return (
    <motion.button
      onClick={() => router.push('/kira')}
      className="fixed left-1/2 -translate-x-1/2 z-[160] h-16 w-16 rounded-full cursor-pointer flex items-center justify-center animate-orb-breathe"
      style={{
        bottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        background: 'linear-gradient(135deg, #00D4FF 0%, #0096FF 50%, #8B5CF6 100%)',
      }}
      initial={{ opacity: 0, scale: 0.6, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring' as const, stiffness: 200, damping: 20, delay: 0.5 }}
      whileTap={{ scale: 0.88, transition: { type: 'spring' as const, stiffness: 400, damping: 15 } }}
    >
      <div className="absolute inset-0 rounded-full bg-black/20" />
      <div className="relative">
        <KiraLogo size="md" />
      </div>
    </motion.button>
  )
}
