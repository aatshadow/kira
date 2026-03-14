'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const weekDays = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 7, label: 'Dom' },
]

export function GoalsSettings() {
  const [dailyGoal, setDailyGoal] = useState('8')
  const [weeklyGoal, setWeeklyGoal] = useState('40')
  const [workDays, setWorkDays] = useState([1, 2, 3, 4, 5])
  const [saving, setSaving] = useState(false)

  const toggleDay = (day: number) => {
    setWorkDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Objetivos</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Horas diarias</Label>
            <Input type="number" value={dailyGoal} onChange={(e) => setDailyGoal(e.target.value)} className="bg-secondary" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Horas semanales</Label>
            <Input type="number" value={weeklyGoal} onChange={(e) => setWeeklyGoal(e.target.value)} className="bg-secondary" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Días laborables</Label>
          <div className="flex gap-2">
            {weekDays.map((day) => (
              <button
                key={day.id}
                onClick={() => toggleDay(day.id)}
                className={cn(
                  'h-9 w-9 rounded-md text-xs font-medium transition-all cursor-pointer',
                  workDays.includes(day.id)
                    ? 'bg-[rgba(0,212,255,0.08)] text-[#00D4FF] border border-[rgba(0,212,255,0.25)]'
                    : 'bg-secondary text-muted-foreground border border-border'
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => { setSaving(true); setTimeout(() => setSaving(false), 500) }} disabled={saving} className="bg-[#00D4FF] text-black hover:bg-[#00A8CC]">
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}
