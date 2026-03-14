'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatDurationFromSecs } from '@/lib/utils/time'

interface SessionHistoryProps {
  sessions: {
    id: string
    task_title: string
    category: string
    started_at: string
    net_secs: number
  }[]
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  if (sessions.length === 0)
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Historial de sesiones
        </h3>
        <p className="text-sm text-muted-foreground text-center py-10">Sin sesiones registradas</p>
      </div>
    )

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Historial de sesiones
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[11px] text-muted-foreground font-medium py-2 pr-4">
                Fecha
              </th>
              <th className="text-left text-[11px] text-muted-foreground font-medium py-2 pr-4">
                Task
              </th>
              <th className="text-left text-[11px] text-muted-foreground font-medium py-2 pr-4">
                Categoría
              </th>
              <th className="text-right text-[11px] text-muted-foreground font-medium py-2">
                Duración
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.id}
                className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
              >
                <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                  {format(new Date(s.started_at), 'd MMM, HH:mm', { locale: es })}
                </td>
                <td className="py-2.5 pr-4 text-xs text-foreground">{s.task_title}</td>
                <td className="py-2.5 pr-4 text-xs text-muted-foreground">{s.category || '—'}</td>
                <td className="py-2.5 text-xs text-right font-mono text-[#00D4FF]">
                  {formatDurationFromSecs(s.net_secs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
