'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTimerStore } from '@/stores/timerStore'
import { useUIStore } from '@/stores/uiStore'
import { formatTime } from '@/lib/utils/time'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/management', label: 'Management' },
  { href: '/kira', label: 'KIRA' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/settings', label: 'Settings' },
]

export function TopBar() {
  const pathname = usePathname()
  const { sessions, activeSessionId } = useTimerStore()
  const { toggleTimerFloat } = useUIStore()

  const activeSession = sessions.find((s) => s.id === activeSessionId)
  const hasActive = !!activeSession

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border/50 bg-background/85 backdrop-blur-xl">
      <div className="flex h-full items-center px-6 lg:px-10 max-w-[1400px] mx-auto">
        {/* Logo */}
        <Link href="/" className="mr-8 shrink-0 flex items-center gap-2">
          <Image src="/logo.png" alt="KIRA" width={24} height={24} className="rounded-full" />
          <span className="text-sm font-bold tracking-[0.15em] text-foreground">KIRA</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navLinks.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] font-normal transition-colors rounded-md',
                  isActive ? 'text-[#00D4FF]' : 'text-muted-foreground hover:text-foreground/80'
                )}
              >
                {link.label}
                {isActive && <div className="mt-0.5 h-px w-full bg-[#00D4FF]" />}
              </Link>
            )
          })}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={toggleTimerFloat}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer',
              hasActive
                ? 'bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.25)] shadow-[0_0_8px_rgba(0,212,255,0.4)]'
                : 'hover:bg-secondary'
            )}
          >
            {hasActive ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[#00D4FF] animate-kira-pulse" />
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
          </button>

          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] bg-secondary text-foreground">
              <User className="h-3.5 w-3.5" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
