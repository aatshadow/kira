import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: string
  subtitle?: string
  accent?: boolean
}

export function MetricCard({ icon: Icon, label, value, subtitle, accent }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn('h-4 w-4', accent ? 'text-[#00D4FF]' : 'text-muted-foreground')} />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('text-2xl font-bold', accent ? 'text-[#00D4FF]' : 'text-foreground')}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  )
}
