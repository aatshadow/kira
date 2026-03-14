'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Check, Flame, Repeat, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/getUserId'
import { format, subDays, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'

interface Habit {
  id: string
  name: string
  frequency: string
  target_time: string | null
  duration_mins: number | null
  streak: number
  created_at: string
}

interface HabitLog {
  id: string
  habit_id: string
  completed_at: string
  duration_mins: number | null
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newFrequency, setNewFrequency] = useState('daily')
  const [newTime, setNewTime] = useState('')
  const [newDuration, setNewDuration] = useState('')

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const userId = await getUserId()
    if (!userId) return

    const [habitsRes, logsRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('habit_logs').select('*').eq('user_id', userId).gte('completed_at', subDays(new Date(), 30).toISOString()),
    ])

    if (habitsRes.data) setHabits(habitsRes.data)
    if (logsRes.data) setLogs(logsRes.data)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const createHabit = async () => {
    if (!newName.trim()) return
    const supabase = createClient()
    const userId = await getUserId()
    if (!userId) return

    await supabase.from('habits').insert({
      user_id: userId,
      name: newName.trim(),
      frequency: newFrequency,
      target_time: newTime || null,
      duration_mins: newDuration ? parseInt(newDuration) : null,
      streak: 0,
    })

    setNewName('')
    setNewTime('')
    setNewDuration('')
    setShowCreate(false)
    fetchData()
  }

  const toggleHabitToday = async (habit: Habit) => {
    const supabase = createClient()
    const userId = await getUserId()
    if (!userId) return

    const today = new Date()
    const existingLog = logs.find(
      (l) => l.habit_id === habit.id && isSameDay(new Date(l.completed_at), today)
    )

    if (existingLog) {
      await supabase.from('habit_logs').delete().eq('id', existingLog.id)
    } else {
      await supabase.from('habit_logs').insert({
        user_id: userId,
        habit_id: habit.id,
        completed_at: new Date().toISOString(),
        duration_mins: habit.duration_mins,
      })
    }

    fetchData()
  }

  const deleteHabit = async (id: string) => {
    const supabase = createClient()
    await supabase.from('habits').delete().eq('id', id)
    fetchData()
  }

  const isCompletedToday = (habitId: string) => {
    const today = new Date()
    return logs.some((l) => l.habit_id === habitId && isSameDay(new Date(l.completed_at), today))
  }

  const getStreak = (habitId: string) => {
    let streak = 0
    const habitLogs = logs
      .filter((l) => l.habit_id === habitId)
      .map((l) => new Date(l.completed_at))
      .sort((a, b) => b.getTime() - a.getTime())

    let checkDate = new Date()
    // If not completed today, start checking from yesterday
    if (!isCompletedToday(habitId)) {
      checkDate = subDays(checkDate, 1)
    }

    for (let i = 0; i < 365; i++) {
      const found = habitLogs.some((d) => isSameDay(d, checkDate))
      if (found) {
        streak++
        checkDate = subDays(checkDate, 1)
      } else {
        break
      }
    }
    return streak
  }

  // Last 7 days for heatmap
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-foreground">Hábitos</h2>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-[#00D4FF] text-black hover:bg-[#00A8CC] hover:shadow-[0_0_8px_rgba(0,212,255,0.4)]"
        >
          <Plus className="h-4 w-4 mr-1" /> Nuevo hábito
        </Button>
      </div>

      {habits.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Sin hábitos todavía"
          description="Crea hábitos diarios o semanales para construir rutinas productivas"
          actionLabel="+ Nuevo hábito"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const completed = isCompletedToday(habit.id)
            const streak = getStreak(habit.id)
            return (
              <div
                key={habit.id}
                className="group rounded-lg border border-border bg-card p-3 md:p-4 hover:border-border/80 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Check button */}
                  <button
                    onClick={() => toggleHabitToday(habit)}
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0',
                      completed
                        ? 'bg-[#00D4FF] text-black'
                        : 'border-2 border-border hover:border-[#00D4FF]/50'
                    )}
                  >
                    {completed && <Check className="h-4 w-4" />}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', completed && 'text-muted-foreground line-through')}>
                      {habit.name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-muted-foreground capitalize">{habit.frequency}</span>
                      {habit.target_time && (
                        <span className="text-[10px] text-muted-foreground">{habit.target_time}</span>
                      )}
                      {habit.duration_mins && (
                        <span className="text-[10px] text-muted-foreground">{habit.duration_mins}min</span>
                      )}
                    </div>
                  </div>

                  {/* Streak */}
                  {streak > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10">
                      <Flame className="h-3 w-3 text-orange-500" />
                      <span className="text-[11px] font-medium text-orange-500">{streak}</span>
                    </div>
                  )}

                  {/* Mini heatmap (last 7 days) */}
                  <div className="hidden md:flex items-center gap-0.5">
                    {last7Days.map((day) => {
                      const done = logs.some(
                        (l) => l.habit_id === habit.id && isSameDay(new Date(l.completed_at), day)
                      )
                      return (
                        <div
                          key={day.toISOString()}
                          title={format(day, 'EEE d', { locale: es })}
                          className={cn(
                            'h-4 w-4 rounded-sm',
                            done ? 'bg-[#00D4FF]' : 'bg-secondary'
                          )}
                        />
                      )
                    })}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="p-1.5 rounded hover:bg-destructive/20 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Nuevo hábito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Input
                autoFocus
                placeholder="Nombre del hábito"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Frecuencia</Label>
              <Select value={newFrequency} onValueChange={(v) => setNewFrequency(v || 'daily')}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="weekdays">Días laborables</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Hora objetivo</Label>
                <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="bg-secondary" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Duración (min)</Label>
                <Input type="number" placeholder="15" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} className="bg-secondary" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={createHabit} disabled={!newName.trim()} className="bg-[#00D4FF] text-black hover:bg-[#00A8CC]">
              Crear hábito
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
