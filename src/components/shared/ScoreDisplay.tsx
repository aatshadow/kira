import { cn } from '@/lib/utils'

interface ScoreDisplayProps {
  score: number | null
  className?: string
}

export function ScoreDisplay({ score, className }: ScoreDisplayProps) {
  if (score === null) {
    return <span className={cn('text-xs text-muted-foreground', className)}>—</span>
  }
  return (
    <span className={cn('text-xs font-mono font-medium text-[#00D4FF]', className)}>
      {score}
    </span>
  )
}
