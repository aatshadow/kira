'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Clock, User, LayoutGrid, ChevronDown, Home, FolderKanban, Bot, BarChart3, Settings, Calendar, ListTodo, Users, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTimerStore } from '@/stores/timerStore'
import { useUIStore } from '@/stores/uiStore'
import { formatTime } from '@/lib/utils/time'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navLinks = [
  { href: '/', label: 'Consola Central', icon: Home },
  { href: '/management', label: 'Management', icon: FolderKanban },
  { href: '/kira', label: 'KIRA', icon: Bot },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const managementSubs = [
  { href: '/management/calendar', label: 'Calendar', icon: Calendar },
  { href: '/management/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/management/meetings', label: 'Meetings', icon: Users },
  { href: '/management/habits', label: 'Hábitos', icon: Repeat },
]

export function TopBar() {
  const pathname = usePathname()
  const { sessions, activeSessionId } = useTimerStore()
  const { toggleTimerFloat } = useUIStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const activeSession = sessions.find((s) => s.id === activeSessionId)
  const hasActive = !!activeSession

  // Current section label for mobile
  const currentSection = navLinks.find(
    (l) => l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
  )

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [mobileMenuOpen])

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 md:h-14 md:border-b md:border-border/50 md:bg-background/85 md:backdrop-blur-xl">
      {/* Mobile: floating pill header */}
      <div className="md:hidden mx-3 mt-2">
        <div className="flex h-12 items-center justify-between px-4 rounded-2xl border border-border/50 bg-background/90 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center gap-1.5">
            <Image src="/logo.png" alt="KIRA" width={20} height={20} className="rounded-full" />
            <span className="text-xs font-bold tracking-[0.12em] text-foreground">KIRA</span>
          </Link>

          {/* Sections dropdown trigger */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all cursor-pointer',
                mobileMenuOpen
                  ? 'bg-[rgba(0,212,255,0.1)] text-[#00D4FF]'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>{currentSection?.label || 'Sections'}</span>
              <ChevronDown className={cn('h-3 w-3 transition-transform', mobileMenuOpen && 'rotate-180')} />
            </button>

            {/* Dropdown */}
            {mobileMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden animate-kira-modal-in">
                <div className="p-1.5">
                  {navLinks.map((link) => {
                    const Icon = link.icon
                    const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
                    const isManagement = link.href === '/management'
                    const showSubs = isManagement && pathname.startsWith('/management')
                    return (
                      <div key={link.href}>
                        <Link
                          href={isManagement ? '/management/tasks' : link.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                            isActive
                              ? 'text-[#00D4FF] bg-[rgba(0,212,255,0.08)]'
                              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {link.label}
                        </Link>
                        {/* Management sub-items */}
                        {isManagement && (showSubs || isActive) && (
                          <div className="ml-4 pl-3 border-l border-border/40 my-0.5">
                            {managementSubs.map((sub) => {
                              const SubIcon = sub.icon
                              const subActive = pathname === sub.href
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  className={cn(
                                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors',
                                    subActive
                                      ? 'text-[#00D4FF] bg-[rgba(0,212,255,0.06)]'
                                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                  )}
                                >
                                  <SubIcon className="h-3.5 w-3.5" />
                                  {sub.label}
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: timer + avatar */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTimerFloat}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-full transition-all cursor-pointer',
                hasActive
                  ? 'bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.25)]'
                  : 'hover:bg-secondary'
              )}
            >
              {hasActive ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00D4FF] animate-kira-pulse" />
                  <span className="text-[10px] font-mono text-[#00D4FF]">
                    {formatTime(activeSession.elapsedSecs)}
                  </span>
                </>
              ) : (
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>

            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[9px] bg-secondary text-foreground">
                <User className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Desktop: classic header */}
      <div className="hidden md:flex h-14 items-center px-6 lg:px-10 max-w-[1400px] mx-auto">
        {/* Logo */}
        <Link href="/" className="mr-8 shrink-0 flex items-center gap-2">
          <Image src="/logo.png" alt="KIRA" width={24} height={24} className="rounded-full" />
          <span className="text-sm font-bold tracking-[0.15em] text-foreground">KIRA</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 flex-1 justify-center">
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
