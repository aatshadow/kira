import { cn } from '@/lib/utils'
import type { Priority } from '@/types/task'
import { PRIORITY_COLORS } from '@/types/task'

interface PriorityDotProps {
  priority: Priority | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-3 w-3',
}

export function PriorityDot({ priority, size = 'md', className }: PriorityDotProps) {
  const color = priority ? PRIORITY_COLORS[priority] : '#444444'
  return (
    <span
      className={cn('inline-block rounded-full shrink-0', sizes[size], className)}
      style={{ backgroundColor: color }}
    />
  )
}
