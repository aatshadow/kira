'use client'

import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, Inbox, Bot, Activity, FolderKanban } from 'lucide-react'
import { cn } from '@/lib/utils'

const apps = [
  { href: '/management/tasks', icon: FolderKanban, label: 'Tasks', color: '#00D4FF' },
  { href: '/inbox', icon: Inbox, label: 'Inbox', color: '#8B5CF6' },
  { href: '/', icon: Home, label: 'Home', color: '#FFFFFF' },
  { href: '/kira', icon: Bot, label: 'KIRA', color: '#00D4FF' },
  { href: '/agents', icon: Activity, label: 'Agents', color: '#10B981' },
]

export function AppDock() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-[100] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="mx-3 mb-2 flex items-center justify-around py-2 px-1 rounded-2xl bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/[0.06]">
        {apps.map((app) => {
          const Icon = app.icon
          const isActive = app.href === '/' ? pathname === '/' : pathname.startsWith(app.href)
          return (
            <motion.button
              key={app.href}
              onClick={() => router.push(app.href)}
              whileTap={{ scale: 0.82 }}
              className="flex flex-col items-center gap-0.5 cursor-pointer relative px-3 py-1"
            >
              <div className={cn(
                'h-10 w-10 rounded-[12px] flex items-center justify-center transition-all',
                isActive
                  ? 'bg-white/[0.12] shadow-[0_0_12px_rgba(0,212,255,0.15)]'
                  : 'bg-white/[0.04]'
              )}>
                <Icon
                  className="h-5 w-5 transition-colors"
                  style={{ color: isActive ? app.color : '#666' }}
                />
              </div>
              <span className={cn(
                'text-[9px] font-medium transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground/60'
              )}>
                {app.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </motion.nav>
  )
}
