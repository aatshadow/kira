'use client'

import { useMemo, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getGreeting, formatDate } from '@/lib/utils/time'
import { useTaskStore } from '@/stores/taskStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/getUserId'
import { IS_DEMO } from '@/lib/demo'

interface DayStatusProps {
  dailyGoalHours: number
  calendarEventsMins?: number
}

function ProgressRing({ progress, totalLabel, goalLabel }: { progress: number; totalLabel: string; goalLabel: string }) {
  const size = 160
  const stroke = 7
  const radius = (size - stroke) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-[#1a1a1a]"
        />
        {/* Progress ring — animated */}
        {progress > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#kira-ring-gradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
            style={{ filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.4))' }}
          />
        )}
        <defs>
          <linearGradient id="kira-ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="50%" stopColor="#0096FF" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <span className="text-[28px] font-semibold font-mono text-foreground leading-none tracking-tight">{totalLabel}</span>
        <span className="text-[10px] text-muted-foreground mt-1.5 font-medium">de {goalLabel}</span>
      </motion.div>
    </div>
  )
}

export function DayStatus({ dailyGoalHours, calendarEventsMins = 0 }: DayStatusProps) {
  const { tasks } = useTaskStore()
  const { meetings } = useMeetingStore()
  const today = new Date()

  const [operativaMins, setOperativaMins] = useState(0)

  useEffect(() => {
    if (IS_DEMO) return
    async function fetchWorkedTime() {
      const userId = await getUserId()
      if (!userId) return
      const supabase = createClient()
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)
      const { data, error } = await supabase
        .from('timer_sessions')
        .select('started_at, ended_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('started_at', startOfDay.toISOString())
        .lte('started_at', endOfDay.toISOString())
      if (error || !data) return
      let totalSecs = 0
      for (const session of data) {
        if (session.started_at && session.ended_at) {
          totalSecs += (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000
        }
      }
      setOperativaMins(Math.round(totalSecs / 60))
    }
    fetchWorkedTime()
    const interval = setInterval(fetchWorkedTime, 60000)
    return () => clearInterval(interval)
  }, [])

  const meetingsMins = useMemo(() => {
    const todayStr = today.toDateString()
    return meetings
      .filter((m) => m.status === 'completed' && m.scheduled_at && new Date(m.scheduled_at).toDateString() === todayStr && m.duration_mins)
      .reduce((sum, m) => sum + (m.duration_mins || 0), 0) + calendarEventsMins
  }, [meetings, calendarEventsMins, today])

  const totalWorkedMins = operativaMins + meetingsMins

  const completedToday = useMemo(
    () => tasks.filter((t) => t.status === 'done' && t.completed_at && new Date(t.completed_at).toDateString() === today.toDateString()).length,
    [tasks, today]
  )

  const plannedToday = useMemo(
    () => tasks.filter((t) => ['todo', 'in_progress'].includes(t.status) || (t.status === 'done' && t.completed_at && new Date(t.completed_at).toDateString() === today.toDateString())).length,
    [tasks, today]
  )

  const goalMins = dailyGoalHours * 60
  const progress = goalMins > 0 ? Math.min((totalWorkedMins / goalMins) * 100, 100) : 0

  const fmtTime = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const totalLabel = totalWorkedMins >= 60
    ? `${Math.floor(totalWorkedMins / 60)}:${String(totalWorkedMins % 60).padStart(2, '0')}`
    : `${totalWorkedMins}m`

  const statItems = [
    { label: 'Operativa', value: fmtTime(operativaMins), color: '#00D4FF' },
    { label: 'Meetings', value: fmtTime(meetingsMins), color: '#8B5CF6' },
    { label: 'Tasks', value: `${completedToday}/${plannedToday}`, color: '#22C55A' },
  ]

  return (
    <motion.div
      className="glass-elevated relative overflow-hidden p-6 md:p-8"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring' as const, stiffness: 260, damping: 24 }}
    >
      {/* Ambient glow background */}
      <div className="absolute inset-0 kira-hero-gradient pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-[240px] h-[240px] rounded-full bg-[rgba(0,212,255,0.04)] blur-[100px] pointer-events-none" />

      <div className="relative">
        {/* Greeting */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-xl md:text-2xl font-bold text-foreground">{getGreeting()}, Alex</h2>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{formatDate(today)}</p>
        </motion.div>

        {/* Ring + Stats */}
        <div className="flex items-center gap-6 md:gap-10">
          <div className="relative">
            <ProgressRing
              progress={progress}
              totalLabel={totalLabel}
              goalLabel={`${dailyGoalHours}h`}
            />
            {/* Breathing halo */}
            <div className="absolute inset-0 rounded-full animate-kira-glow pointer-events-none" style={{ filter: 'blur(20px)', background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)' }} />
          </div>

          <div className="flex-1 space-y-2.5">
            {statItems.map((item, i) => (
              <motion.div
                key={item.label}
                className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[13px] text-muted-foreground">{item.label}</span>
                </div>
                <span className="text-sm font-mono font-semibold text-foreground">{item.value}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
