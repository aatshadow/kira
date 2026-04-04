'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, User, Home, FolderKanban, Bot, BarChart3, Settings, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTimerStore } from '@/stores/timerStore'
import { useUIStore } from '@/stores/uiStore'
import { formatTime } from '@/lib/utils/time'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { KiraLogo } from '@/components/shared/KiraLogo'

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/management', label: 'Management', icon: FolderKanban },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/kira', label: 'KIRA', icon: Bot },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function TopBar() {
  const pathname = usePathname()
  const { sessions, activeSessionId } = useTimerStore()
  const { toggleTimerFloat } = useUIStore()

  const activeSession = sessions.find((s) => s.id === activeSessionId)
  const hasActive = !!activeSession

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Mobile: minimal top bar */}
      <div className="md:hidden flex items-center justify-between px-5 h-12" style={{ marginTop: 'max(0.25rem, env(safe-area-inset-top))' }}>
        <Link href="/" className="flex items-center gap-1.5">
          <KiraLogo size="sm" />
          <span className="text-[11px] font-bold tracking-[0.12em] text-foreground">KIRA</span>
        </Link>

        <div className="flex items-center gap-2">
          {hasActive && (
            <motion.button
              onClick={toggleTimerFloat}
              whileTap={{ scale: 0.93 }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.25)] cursor-pointer"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#00D4FF] animate-kira-pulse" />
              <span className="text-[10px] font-mono text-[#00D4FF]">
                {formatTime(activeSession.elapsedSecs)}
              </span>
            </motion.button>
          )}
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[9px] bg-white/[0.06] text-foreground">
              <User className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Desktop: classic header */}
      <div className="hidden md:flex h-14 items-center px-6 lg:px-10 max-w-[1400px] mx-auto border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <Link href="/" className="mr-8 shrink-0 flex items-center gap-2">
          <KiraLogo size="sm" />
          <span className="text-sm font-bold tracking-[0.15em] text-foreground">KIRA</span>
        </Link>

        <nav className="flex items-center gap-1 flex-1 justify-center relative">
          {navLinks.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] font-normal transition-colors rounded-md',
                  isActive ? 'text-[#00D4FF]' : 'text-muted-foreground hover:text-foreground/80'
                )}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-0 right-0 h-px bg-[#00D4FF]"
                    transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3 ml-auto">
          <motion.button
            onClick={toggleTimerFloat}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer',
              hasActive
                ? 'bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.25)] shadow-[0_0_8px_rgba(0,212,255,0.4)]'
                : 'hover:bg-secondary'
            )}
          >
            {hasActive ? (
              <>
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-[#00D4FF]"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-xs font-mono text-[#00D4FF]">
                  {formatTime(activeSession.elapsedSecs)}
                </span>
                <span className="text-[11px] text-muted-foreground max-w-[120px] truncate">
                  {activeSession.taskTitle}
                </span>
              </>
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground" />
            )}
          </motion.button>

          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] bg-secondary text-foreground">
              <User className="h-3.5 w-3.5" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </motion.header>
  )
}
