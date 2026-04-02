'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useUser } from '@/lib/hooks/useUser'

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
  const { user, updateProfile } = useUser()
  const [dailyGoal, setDailyGoal] = useState('8')
  const [weeklyGoal, setWeeklyGoal] = useState('40')
  const [workDays, setWorkDays] = useState([1, 2, 3, 4, 5])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setDailyGoal(String(user.daily_goal_hours))
      setWeeklyGoal(String(user.weekly_goal_hours))
      setWorkDays(user.work_days)
    }
  }, [user])

  const toggleDay = (day: number) => {
    setWorkDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  const handleSave = async () => {
    setSaving(true)
    await updateProfile({
      daily_goal_hours: Number(dailyGoal),
      weekly_goal_hours: Number(weeklyGoal),
      work_days: workDays,
    })
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Objetivos</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Horas diarias</Label>
            <Input type="number" value={dailyGoal} onChange={(e) => setDailyGoal(e.target.value)} className="bg-white/[0.06] border-white/[0.1] rounded-xl" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Horas semanales</Label>
            <Input type="number" value={weeklyGoal} onChange={(e) => setWeeklyGoal(e.target.value)} className="bg-white/[0.06] border-white/[0.1] rounded-xl" />
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
                  'h-9 w-9 rounded-xl text-xs font-medium transition-all cursor-pointer',
                  workDays.includes(day.id)
                    ? 'bg-[rgba(0,212,255,0.08)] text-[#00D4FF] border border-[rgba(0,212,255,0.25)]'
                    : 'bg-white/[0.06] text-muted-foreground border-white/[0.1]'
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-[#00D4FF] text-black hover:bg-[#00A8CC] rounded-2xl">
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}
