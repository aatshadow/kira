'use client'

import { Clock, CheckCircle, BarChart3, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/analytics/MetricCard'
import { TimeByCategory } from '@/components/analytics/TimeByCategory'
import { TimeByProject } from '@/components/analytics/TimeByProject'
import { ProductivityHeatmap } from '@/components/analytics/ProductivityHeatmap'
import { SessionHistory } from '@/components/analytics/SessionHistory'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { useAnalytics, type DateRange } from '@/lib/hooks/useAnalytics'
import { formatDurationFromSecs } from '@/lib/utils/time'
import { cn } from '@/lib/utils'

const ranges: { id: DateRange; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
]

export default function AnalyticsPage() {
  const { data, loading, range, setRange } = useAnalytics()

  if (loading) {
    return (
      <div className="py-8">
        <LoadingSkeleton lines={6} />
      </div>
    )
  }

  if (!data || (data.totalWorkedSecs === 0 && data.tasksCompleted === 0)) {
    return (
      <div className="py-16">
        <EmptyState
          icon={BarChart3}
          title="Sin datos todavía"
          description="Completa tu primera sesión de trabajo para ver tu inteligencia operativa"
          actionLabel="Ir al backlog"
        />
      </div>
    )
  }

  return (
    <div className="py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          {ranges.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                'px-3 py-1.5 text-xs transition-colors cursor-pointer',
                range === r.id
                  ? 'bg-[rgba(0,212,255,0.08)] text-[#00D4FF]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={Clock}
          label="Tiempo trabajado"
          value={formatDurationFromSecs(data.totalWorkedSecs)}
          accent
        />
        <MetricCard
          icon={CheckCircle}
          label="Tasks completadas"
          value={String(data.tasksCompleted)}
          subtitle={`${data.tasksPending} pendientes`}
        />
        <MetricCard
          icon={BarChart3}
          label="Score KIRA"
          value={data.avgScore !== null ? String(data.avgScore) : '—'}
          subtitle="Promedio del período"
        />
        <MetricCard
          icon={Zap}
          label="Eficiencia"
          value={data.efficiencyRatio !== null ? `${data.efficiencyRatio}%` : '—'}
          subtitle="Real vs estimado"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <TimeByCategory data={data.timeByCategory} />
        <TimeByProject data={data.timeByProject} />
      </div>

      {/* Heatmap */}
      <div className="mb-6">
        <ProductivityHeatmap data={data.heatmap} />
      </div>

      {/* Session history */}
      <SessionHistory sessions={data.sessions} />
    </div>
  )
}
