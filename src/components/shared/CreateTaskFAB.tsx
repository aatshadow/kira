'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Clock, X } from 'lucide-react'
import Image from 'next/image'
import { useUIStore } from '@/stores/uiStore'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function CreateTaskFAB() {
  const { openModal, openTimerFloat } = useUIStore()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [menuOpen])

  // Close on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  if (pathname.startsWith('/settings') || pathname.startsWith('/kira')) return null

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 md:bottom-6 md:left-6 md:right-auto z-[150]">
      {/* Expanded menu */}
      {menuOpen && (
        <div className="absolute bottom-16 right-0 md:left-0 md:right-auto flex flex-col gap-2 animate-kira-float-in">
          <button
            onClick={() => { setMenuOpen(false); openTimerFloat() }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-card border border-border shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-secondary transition-colors cursor-pointer whitespace-nowrap"
          >
            <Clock className="h-4 w-4 text-[#00D4FF]" />
            <span className="text-sm text-foreground">Timer</span>
          </button>
          <button
            onClick={() => { setMenuOpen(false); openModal('task-create') }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-card border border-border shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-secondary transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4 text-[#00D4FF]" />
            <span className="text-sm text-foreground">Nueva task</span>
          </button>
        </div>
      )}

      {/* Main FAB - KIRA logo */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className={cn(
          'h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer overflow-hidden',
          menuOpen
            ? 'bg-secondary border border-border'
            : 'bg-[#00D4FF] hover:shadow-[0_0_20px_rgba(0,212,255,0.4)]'
        )}
      >
        {menuOpen ? (
          <X className="h-5 w-5 text-foreground" />
        ) : (
          <Image src="/logo.png" alt="KIRA" width={48} height={48} className="h-full w-full object-cover" />
        )}
      </button>
    </div>
  )
}
