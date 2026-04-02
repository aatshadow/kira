'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, CheckCircle, BarChart3, Zap, Video, Target,
  Calendar, Users, User, TrendingUp, Timer, ListChecks,
  Flame, Award, FileText, Loader2, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { MetricCard } from '@/components/analytics/MetricCard'
import { TimeByCategory } from '@/components/analytics/TimeByCategory'
import { TimeByProject } from '@/components/analytics/TimeByProject'
import { ProductivityHeatmap } from '@/components/analytics/ProductivityHeatmap'
import { SessionHistory } from '@/components/analytics/SessionHistory'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { useAnalytics, type DateRange, type AnalyticsData } from '@/lib/hooks/useAnalytics'
import { formatDurationFromSecs } from '@/lib/utils/time'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type Tab = 'overview' | 'tasks' | 'meetings' | 'habits'

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'habits', label: 'Habitos' },
]

const ranges: { id: DateRange; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
]

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'En progreso',
  waiting: 'Esperando',
  done: 'Completado',
}

const STATUS_COLORS: Record<string, string> = {
  backlog: '#6b7280',
  todo: '#3b82f6',
  in_progress: '#f59e0b',
  waiting: '#8b5cf6',
  done: '#10b981',
}

const PRIORITY_LABELS: Record<string, string> = {
  q1: 'Q1 - Urgente + Importante',
  q2: 'Q2 - Importante',
  q3: 'Q3 - Urgente',
  q4: 'Q4 - Ni urgente ni importante',
  none: 'Sin prioridad',
}

const PRIORITY_COLORS: Record<string, string> = {
  q1: '#ef4444',
  q2: '#f59e0b',
  q3: '#3b82f6',
  q4: '#6b7280',
  none: '#4b5563',
}

/* ------------------------------------------------------------------ */
/*  Inline chart helpers                                               */
/* ------------------------------------------------------------------ */

function ProgressCircle({ value, size = 80, strokeWidth = 6, color = '#00D4FF' }: {
  value: number; size?: number; strokeWidth?: number; color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(value, 0), 100)
  const offset = circumference - (clamped / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="currentColor" className="text-border" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  )
}

function MiniBarChart({ items, maxVal }: {
  items: { label: string; value: number; color: string }[]; maxVal: number
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground truncate mr-2">{item.label}</span>
            <span className="text-foreground font-medium">{item.value}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: maxVal > 0 ? `${(item.value / maxVal) * 100}%` : '0%',
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function GroupedBarChart({ data }: {
  data: { label: string; created: number; completed: number }[]
}) {
  const maxVal = Math.max(...data.map(d => Math.max(d.created, d.completed)), 1)

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="flex items-end gap-0.5 h-24 w-full justify-center">
            <div
              className="w-2.5 rounded-t transition-all duration-500"
              style={{
                height: `${maxVal > 0 ? (d.created / maxVal) * 100 : 0}%`,
                backgroundColor: '#3b82f6',
                minHeight: d.created > 0 ? '4px' : '0px',
              }}
              title={`Creadas: ${d.created}`}
            />
            <div
              className="w-2.5 rounded-t transition-all duration-500"
              style={{
                height: `${maxVal > 0 ? (d.completed / maxVal) * 100 : 0}%`,
                backgroundColor: '#10b981',
                minHeight: d.completed > 0 ? '4px' : '0px',
              }}
              title={`Completadas: ${d.completed}`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function PieChart({ slices }: {
  slices: { label: string; value: number; color: string }[]
}) {
  const total = slices.reduce((a, s) => a + s.value, 0)
  if (total === 0) return <p className="text-xs text-muted-foreground text-center py-6">Sin datos</p>

  let accumulated = 0
  const paths = slices.filter(s => s.value > 0).map((s) => {
    const startAngle = (accumulated / total) * 360
    accumulated += s.value
    const endAngle = (accumulated / total) * 360
    const largeArc = endAngle - startAngle > 180 ? 1 : 0

    const toRad = (a: number) => ((a - 90) * Math.PI) / 180
    const x1 = 50 + 40 * Math.cos(toRad(startAngle))
    const y1 = 50 + 40 * Math.sin(toRad(startAngle))
    const x2 = 50 + 40 * Math.cos(toRad(endAngle))
    const y2 = 50 + 40 * Math.sin(toRad(endAngle))

    return (
      <path
        key={s.label}
        d={`M50,50 L${x1},${y1} A40,40 0 ${largeArc},1 ${x2},${y2} Z`}
        fill={s.color}
        className="transition-all duration-500"
      >
        <title>{`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}</title>
      </path>
    )
  })

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
        {paths}
      </svg>
      <div className="space-y-1.5 min-w-0">
        {slices.filter(s => s.value > 0).map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground truncate">{s.label}</span>
            <span className="text-foreground font-medium ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HabitWeeklyHeatmap({ habitCompletionRates, habitLogs }: {
  habitCompletionRates: AnalyticsData['habitCompletionRates']
  habitLogs: AnalyticsData['habitLogs']
}) {
  const dayLabels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

  return (
    <div className="space-y-3">
      {habitCompletionRates.map(habit => {
        const logs = habitLogs.filter(l => l.habit_id === habit.habitId)
        const logDays = logs.map(l => new Date(l.completed_at).getDay())
        // Convert JS day (0=Sun) to Mon-based index
        const dayPresence = dayLabels.map((_, i) => {
          const jsDay = i === 6 ? 0 : i + 1
          return logDays.includes(jsDay)
        })

        return (
          <div key={habit.habitId}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-foreground truncate mr-2">{habit.name}</span>
              <span className="text-xs text-muted-foreground">{habit.rate}%</span>
            </div>
            <div className="flex gap-1">
              {dayLabels.map((day, i) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className={cn(
                      'w-full h-5 rounded-sm transition-colors',
                      dayPresence[i]
                        ? 'bg-[#00D4FF]'
                        : 'bg-secondary'
                    )}
                  />
                  <span className="text-[9px] text-muted-foreground">{day}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Card wrapper                                                       */
/* ------------------------------------------------------------------ */

function Card({ children, className, title }: {
  children: React.ReactNode; className?: string; title?: string
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-5', className)}>
      {title && <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>}
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Overview                                                      */
/* ------------------------------------------------------------------ */

function OverviewTab({ data }: { data: AnalyticsData }) {
  const [summaryType, setSummaryType] = useState<'diario' | 'semanal' | 'mensual' | null>(null)
  const [summaryText, setSummaryText] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  const periodMap = { diario: 'daily', semanal: 'weekly', mensual: 'monthly' } as const

  async function requestSummary(type: 'diario' | 'semanal' | 'mensual') {
    setSummaryType(type)
    setSummaryLoading(true)
    setSummaryText(null)
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: periodMap[type] }),
      })
      if (res.ok) {
        const json = await res.json()
        setSummaryText(json.summary || 'Resumen generado.')
      } else {
        setSummaryText('No se pudo generar el resumen. Intenta de nuevo.')
      }
    } catch {
      setSummaryText('Error de conexion al generar el resumen.')
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Clock}
          label="Tiempo total"
          value={formatDurationFromSecs(data.totalTimeSecs)}
          subtitle={`Operativa: ${formatDurationFromSecs(data.totalWorkedSecs)} + Meetings: ${formatDurationFromSecs(data.totalMeetingSecs)}`}
          accent
        />
        <MetricCard
          icon={CheckCircle}
          label="Tasks completadas"
          value={String(data.tasksCompleted)}
          subtitle={`${data.tasksPending} pendientes`}
        />
        <MetricCard
          icon={Video}
          label="Meetings completados"
          value={String(data.meetingsCompleted)}
        />
        <MetricCard
          icon={Target}
          label="Habitos"
          value={data.habitsAdherence !== null ? `${data.habitsAdherence}%` : '--'}
          subtitle={`${data.habitsCompletedToday} completados hoy`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TimeByCategory data={data.timeByCategory} />
        <TimeByProject data={data.timeByProject} />
      </div>

      {/* Heatmap */}
      <ProductivityHeatmap data={data.heatmap} />

      {/* Summary section */}
      <Card title="Resumenes AI">
        <div className="flex flex-wrap gap-2 mb-4">
          {(['diario', 'semanal', 'mensual'] as const).map(type => (
            <button
              key={type}
              onClick={() => requestSummary(type)}
              disabled={summaryLoading}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                'border border-border hover:border-[#00D4FF]/50',
                summaryType === type && !summaryLoading
                  ? 'bg-[rgba(0,212,255,0.08)] text-[#00D4FF] border-[#00D4FF]/30'
                  : 'text-muted-foreground hover:text-foreground',
                summaryLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <FileText className="inline h-3 w-3 mr-1.5" />
              Resumen {type}
            </button>
          ))}
        </div>

        {summaryLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin text-[#00D4FF]" />
            Generando resumen {summaryType}...
          </div>
        )}

        {summaryText && !summaryLoading && (
          <div className="rounded-lg bg-secondary/50 border border-border p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{summaryText}</p>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Tasks                                                         */
/* ------------------------------------------------------------------ */

function TasksTab({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-6">
      {/* Top metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={TrendingUp}
          label="Tasa de completado"
          value={data.completionRate !== null ? `${data.completionRate}%` : '--'}
          subtitle={`${data.tasksCompleted} completadas de ${data.tasksCreated} creadas`}
          accent
        />
        <MetricCard
          icon={Timer}
          label="Tiempo promedio/task"
          value={data.avgTimePerTaskSecs !== null ? formatDurationFromSecs(data.avgTimePerTaskSecs) : '--'}
        />
        <MetricCard
          icon={Zap}
          label="Eficiencia"
          value={data.efficiencyRatio !== null ? `${data.efficiencyRatio}%` : '--'}
          subtitle={data.efficiencyRatio !== null
            ? (data.efficiencyRatio > 100
              ? 'Mas rapido que estimado'
              : data.efficiencyRatio === 100
                ? 'Estimacion perfecta'
                : 'Tomo mas de lo estimado')
            : 'Sin estimaciones'
          }
        />
        <MetricCard
          icon={BarChart3}
          label="Score KIRA"
          value={data.avgScore !== null ? String(data.avgScore) : '--'}
          subtitle="Promedio del periodo"
        />
      </div>

      {/* Tasks over time */}
      <Card title="Creadas vs Completadas">
        {data.tasksOverTime.length > 0 ? (
          <>
            <GroupedBarChart data={data.tasksOverTime} />
            <div className="flex items-center gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Creadas
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Completadas
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">Sin datos en este periodo</p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Time by Priority */}
        <Card title="Tiempo por Prioridad">
          {data.timeByPriority.length > 0 ? (
            <MiniBarChart
              items={data.timeByPriority.map(p => ({
                label: PRIORITY_LABELS[p.priority] || p.priority,
                value: Math.round(p.secs / 60),
                color: PRIORITY_COLORS[p.priority] || '#6b7280',
              }))}
              maxVal={Math.max(...data.timeByPriority.map(p => Math.round(p.secs / 60)), 1)}
            />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">Sin datos</p>
          )}
          {data.timeByPriority.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-2 text-right">Valores en minutos</p>
          )}
        </Card>

        {/* Tasks by Status */}
        <Card title="Tasks por Estado">
          {data.tasksByStatus.length > 0 ? (
            <PieChart
              slices={data.tasksByStatus.map(s => ({
                label: STATUS_LABELS[s.status] || s.status,
                value: s.count,
                color: STATUS_COLORS[s.status] || '#6b7280',
              }))}
            />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">Sin datos</p>
          )}
        </Card>
      </div>

      {/* Top 5 longest tasks */}
      <Card title="Top 5 - Tasks mas largas">
        {data.topLongestTasks.length > 0 ? (
          <div className="space-y-3">
            {data.topLongestTasks.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#00D4FF] w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{t.title}</p>
                </div>
                <span className="text-xs text-muted-foreground font-mono shrink-0">
                  {formatDurationFromSecs(t.secs)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">Sin datos de sesiones</p>
        )}
      </Card>

      {/* Efficiency detail */}
      {data.efficiencyRatio !== null && (
        <Card title="Eficiencia: Estimado vs Real">
          <div className="flex items-center gap-6">
            <div className="relative">
              <ProgressCircle
                value={Math.min(data.efficiencyRatio, 200) / 2}
                size={96}
                strokeWidth={8}
                color={data.efficiencyRatio >= 100 ? '#10b981' : '#f59e0b'}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">{data.efficiencyRatio}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sm">
                {data.efficiencyRatio >= 100 ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-foreground">
                  {data.efficiencyRatio >= 100
                    ? `${data.efficiencyRatio - 100}% mas rapido que lo estimado`
                    : `${100 - data.efficiencyRatio}% mas lento que lo estimado`
                  }
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                100% = estimacion perfecta. {'>'} 100% = terminaste antes.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Meetings                                                      */
/* ------------------------------------------------------------------ */

function MeetingsTab({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Video}
          label="Total meetings"
          value={String(data.meetingsCompleted + data.meetingsScheduled + data.meetingsCancelled)}
          accent
        />
        <MetricCard
          icon={Clock}
          label="Tiempo en meetings"
          value={formatDurationFromSecs(data.totalMeetingSecs)}
        />
        <MetricCard
          icon={Timer}
          label="Duracion promedio"
          value={data.avgMeetingMins !== null ? `${data.avgMeetingMins} min` : '--'}
        />
        <MetricCard
          icon={Calendar}
          label="Programados"
          value={String(data.meetingsScheduled)}
          subtitle={`${data.meetingsCancelled} cancelados`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Meetings by status */}
        <Card title="Meetings por Estado">
          <PieChart
            slices={[
              { label: 'Completados', value: data.meetingsCompleted, color: '#10b981' },
              { label: 'Programados', value: data.meetingsScheduled, color: '#3b82f6' },
              { label: 'Cancelados', value: data.meetingsCancelled, color: '#ef4444' },
            ]}
          />
        </Card>

        {/* Participation */}
        <Card title="Participacion">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#00D4FF]" />
                <span className="text-sm text-foreground">Con participantes</span>
              </div>
              <span className="text-lg font-bold text-foreground ml-auto">{data.meetingsWithParticipants}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Solo</span>
              </div>
              <span className="text-lg font-bold text-foreground ml-auto">{data.meetingsSolo}</span>
            </div>
            {(data.meetingsWithParticipants + data.meetingsSolo) > 0 && (
              <div className="h-3 bg-secondary rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-[#00D4FF] transition-all duration-500"
                  style={{
                    width: `${(data.meetingsWithParticipants / (data.meetingsWithParticipants + data.meetingsSolo)) * 100}%`,
                  }}
                />
                <div className="h-full bg-secondary flex-1" />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Upcoming meetings */}
      <Card title="Proximos meetings">
        {data.upcomingMeetings.length > 0 ? (
          <div className="space-y-3">
            {data.upcomingMeetings.map(m => (
              <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
                <Calendar className="h-4 w-4 text-[#00D4FF] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.scheduled_at).toLocaleDateString('es-ES', {
                      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                {m.participants && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    <Users className="inline h-3 w-3 mr-1" />{m.participants}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">No hay meetings programados</p>
        )}
      </Card>

      {/* Meeting history */}
      <Card title="Historial de meetings">
        {data.meetings.filter(m => m.status === 'completed').length > 0 ? (
          <div className="space-y-2">
            {data.meetings.filter(m => m.status === 'completed').map(m => (
              <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.scheduled_at).toLocaleDateString('es-ES', {
                      weekday: 'short', day: 'numeric', month: 'short'
                    })}
                  </p>
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  {m.duration_mins ? `${m.duration_mins} min` : '--'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">Sin meetings completados en este periodo</p>
        )}
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Habits                                                        */
/* ------------------------------------------------------------------ */

function HabitsTab({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Target}
          label="Total habitos"
          value={String(data.habitsTotal)}
          accent
        />
        <MetricCard
          icon={CheckCircle}
          label="Completados hoy"
          value={String(data.habitsCompletedToday)}
          subtitle={data.habitsTotal > 0 ? `de ${data.habitsTotal}` : undefined}
        />
        <MetricCard
          icon={ListChecks}
          label="Adherencia"
          value={data.habitsAdherence !== null ? `${data.habitsAdherence}%` : '--'}
          subtitle="En el periodo"
        />
        <MetricCard
          icon={Flame}
          label="Mejor racha"
          value={data.habitCompletionRates.length > 0
            ? `${Math.max(...data.habitCompletionRates.map(h => h.streak))} dias`
            : '--'
          }
        />
      </div>

      {/* Overall adherence circle */}
      {data.habitsAdherence !== null && (
        <Card>
          <div className="flex items-center gap-6">
            <div className="relative">
              <ProgressCircle
                value={data.habitsAdherence}
                size={100}
                strokeWidth={8}
                color={data.habitsAdherence >= 80 ? '#10b981' : data.habitsAdherence >= 50 ? '#f59e0b' : '#ef4444'}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-foreground">{data.habitsAdherence}%</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Adherencia general</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Porcentaje de habitos completados sobre el total esperado en el periodo seleccionado.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Per-habit completion rates */}
      <Card title="Tasa de completado por habito">
        {data.habitCompletionRates.length > 0 ? (
          <div className="space-y-4">
            {data.habitCompletionRates.map(h => (
              <div key={h.habitId}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-foreground truncate">{h.name}</span>
                    {h.streak > 0 && (
                      <span className="text-xs text-amber-400 flex items-center gap-0.5 shrink-0">
                        <Flame className="h-3 w-3" /> {h.streak}d
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-foreground shrink-0">{h.rate}%</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${h.rate}%`,
                      backgroundColor: h.rate >= 80 ? '#10b981' : h.rate >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">No hay habitos configurados</p>
        )}
      </Card>

      {/* Streak info */}
      {data.habitCompletionRates.length > 0 && (
        <Card title="Rachas actuales">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {data.habitCompletionRates.map(h => (
              <div key={h.habitId} className="rounded-lg bg-secondary/50 border border-border p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className={cn('h-4 w-4', h.streak > 0 ? 'text-amber-400' : 'text-muted-foreground')} />
                  <span className="text-xl font-bold text-foreground">{h.streak}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{h.name}</p>
                <p className="text-[10px] text-muted-foreground">dias consecutivos</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Weekly heatmap */}
      {data.habitCompletionRates.length > 0 && (
        <Card title="Mapa semanal de completado">
          <HabitWeeklyHeatmap
            habitCompletionRates={data.habitCompletionRates}
            habitLogs={data.habitLogs}
          />
        </Card>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const { data, loading, range, setRange } = useAnalytics()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  if (loading) {
    return (
      <div className="py-8">
        <LoadingSkeleton lines={6} />
      </div>
    )
  }

  if (!data || (data.totalTimeSecs === 0 && data.tasksCompleted === 0 && data.meetingsCompleted === 0 && data.habitsTotal === 0)) {
    return (
      <div className="py-16">
        <EmptyState
          icon={BarChart3}
          title="Sin datos todavia"
          description="Completa tu primera sesion de trabajo para ver tu inteligencia operativa"
          actionLabel="Ir al backlog"
        />
      </div>
    )
  }

  return (
    <motion.div
      className="py-8 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-[rgba(0,212,255,0.03)] blur-[80px] pointer-events-none" />

      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
            {ranges.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  'relative px-3 py-1.5 text-xs transition-colors cursor-pointer rounded-xl z-10',
                  range === r.id
                    ? 'text-[#00D4FF]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {range === r.id && (
                  <motion.div
                    layoutId="analytics-range"
                    className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-xl"
                    transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tab bar */}
      <motion.div
        className="rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm p-1 flex gap-1 mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative flex-1 px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer z-10',
              activeTab === tab.id
                ? 'text-[#00D4FF]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="analytics-tab"
                className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-xl"
                transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.12 } }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeTab === 'overview' && <OverviewTab data={data} />}
          {activeTab === 'tasks' && <TasksTab data={data} />}
          {activeTab === 'meetings' && <MeetingsTab data={data} />}
          {activeTab === 'habits' && <HabitsTab data={data} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
