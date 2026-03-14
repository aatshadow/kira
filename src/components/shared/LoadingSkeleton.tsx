import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
  lines?: number
}

export function LoadingSkeleton({ className, lines = 5 }: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-12 rounded-md animate-kira-shimmer"
          style={{ width: `${100 - i * 5}%` }}
        />
      ))}
    </div>
  )
}
