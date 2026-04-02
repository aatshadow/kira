'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Calendar, ListTodo, Users, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/management/calendar', label: 'Calendar', icon: Calendar },
  { href: '/management/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/management/meetings', label: 'Meetings', icon: Users },
  { href: '/management/habits', label: 'Hábitos', icon: Repeat },
]

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="py-4 md:py-8 px-4 md:px-0">
      {/* Sub-navigation — glass pill */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-4 md:mb-6 scrollbar-hide">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm w-fit min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'relative flex items-center gap-1.5 px-3.5 md:px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap',
                  isActive
                    ? 'text-[#00D4FF]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="management-tab"
                    className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-xl"
                    transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {children}
    </div>
  )
}
