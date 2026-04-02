'use client'

import { type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.06] border border-white/[0.08] mb-6">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-[#00D4FF] text-black hover:bg-[#00A8CC] hover:shadow-[0_0_8px_rgba(0,212,255,0.4)] rounded-2xl transition-all"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
