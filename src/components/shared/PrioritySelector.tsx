'use client'

import { cn } from '@/lib/utils'
import type { Priority } from '@/types/task'

interface PrioritySelectorProps {
  value: Priority | null
  onChange: (priority: Priority) => void
}

const quadrants: { id: Priority; label: string; sublabel: string; color: string }[] = [
  { id: 'q1', label: 'Urgente + Importante', sublabel: 'Hacer ahora', color: '#FF4444' },
  { id: 'q2', label: 'Importante', sublabel: 'Planificar', color: '#F5A623' },
  { id: 'q3', label: 'Urgente', sublabel: 'Delegar', color: '#00D4FF' },
  { id: 'q4', label: 'Ni urgente ni importante', sublabel: 'Eliminar', color: '#444444' },
]

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {quadrants.map((q) => (
        <button
          key={q.id}
          type="button"
          onClick={() => onChange(q.id)}
          className={cn(
            'relative flex flex-col items-start p-3 rounded-md border-2 transition-all cursor-pointer text-left',
            value === q.id
              ? 'bg-current/[0.06]'
              : 'border-border hover:border-muted-foreground/30'
          )}
          style={{
            borderColor: value === q.id ? q.color : undefined,
          }}
        >
          <span
            className="h-2 w-2 rounded-full mb-2"
            style={{ backgroundColor: q.color }}
          />
          <span className={cn('text-xs font-medium', value === q.id ? '' : 'text-foreground')}>
            {q.label}
          </span>
          <span className="text-[10px] text-muted-foreground">{q.sublabel}</span>
        </button>
      ))}
    </div>
  )
}
