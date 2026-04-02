'use client'

import { motion } from 'framer-motion'
import { staggerContainer } from '@/lib/animations'

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
}

export function PageWrapper({ children, className = '', glow = true }: PageWrapperProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={`relative ${className}`}
    >
      {glow && (
        <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-[rgba(0,212,255,0.03)] blur-[80px] pointer-events-none" />
      )}
      {children}
    </motion.div>
  )
}
