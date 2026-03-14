'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
    <div className="py-4 md:py-8">
      {/* Sub-navigation — scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-4 md:mb-6 scrollbar-hide">
        <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg w-fit min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-background text-[#00D4FF] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {children}
    </div>
  )
}
