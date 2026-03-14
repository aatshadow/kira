'use client'

import { useEffect, useCallback } from 'react'
import { useTimerStore } from '@/stores/timerStore'
import { useTaskStore } from '@/stores/taskStore'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/getUserId'
import { IS_DEMO, demoId } from '@/lib/demo'
import type { ActiveTimer } from '@/types/timer'

export function useTimer() {
  const {
    sessions,
    activeSessionId,
    addSession,
    removeSession,
    setActiveSession,
    pauseSession,
    resumeSession,
    tick,
  } = useTimerStore()

  const { updateTask } = useTaskStore()

  useEffect(() => {
    if (!activeSessionId) return
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activeSessionId, tick])

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('kira_timers', JSON.stringify(sessions))
      localStorage.setItem('kira_active_timer', activeSessionId || '')
    } else {
      localStorage.removeItem('kira_timers')
      localStorage.removeItem('kira_active_timer')
    }
  }, [sessions, activeSessionId])

  const startTimer = useCallback(
    async (taskId: string, taskTitle: string, taskCategory: string, taskProject: string) => {
      const supabase = IS_DEMO ? null : createClient()
      const currentActive = activeSessionId
      if (currentActive) {
        pauseSession(currentActive)
        if (!IS_DEMO) {
          await supabase!.from('timer_sessions').update({ paused_at: new Date().toISOString(), status: 'paused' }).eq('id', currentActive)
        }
      }

      let sessionId: string

      if (IS_DEMO) {
        sessionId = demoId()
      } else {
        const userId = await getUserId()
        const { data, error } = await supabase!.from('timer_sessions').insert({ task_id: taskId, user_id: userId, started_at: new Date().toISOString(), status: 'running' }).select().single()
        if (error || !data) return
        sessionId = data.id
        await supabase!.from('tasks').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', taskId)
      }

      updateTask(taskId, { status: 'in_progress' })

      const newSession: ActiveTimer = {
        id: sessionId,
        taskId,
        taskTitle,
        taskCategory,
        taskProject,
        startedAt: Date.now(),
        pausedAt: null,
        totalPausedSecs: 0,
        status: 'running',
        elapsedSecs: 0,
      }

      addSession(newSession)
      setActiveSession(sessionId)
    },
    [activeSessionId, addSession, pauseSession, setActiveSession, updateTask]
  )

  const handlePause = useCallback(
    async (sessionId: string) => {
      pauseSession(sessionId)
      if (!IS_DEMO) {
        const supabase = createClient()
        await supabase.from('timer_sessions').update({ paused_at: new Date().toISOString(), status: 'paused' }).eq('id', sessionId)
      }
    },
    [pauseSession]
  )

  const handleResume = useCallback(
    async (sessionId: string) => {
      const currentActive = activeSessionId
      if (currentActive && currentActive !== sessionId) {
        if (!IS_DEMO) {
          const supabase = createClient()
          await supabase.from('timer_sessions').update({ paused_at: new Date().toISOString(), status: 'paused' }).eq('id', currentActive)
        }
      }
      resumeSession(sessionId)
      if (!IS_DEMO) {
        const supabase = createClient()
        await supabase.from('timer_sessions').update({ paused_at: null, status: 'running' }).eq('id', sessionId)
      }
    },
    [activeSessionId, resumeSession]
  )

  const stopTimer = useCallback(
    async (sessionId: string, markDone: boolean = false) => {
      const session = sessions.find((s) => s.id === sessionId)
      if (!session) return

      const netSecs = session.elapsedSecs
      const supabase = IS_DEMO ? null : createClient()

      if (!IS_DEMO) {
        await supabase!.from('timer_sessions').update({ ended_at: new Date().toISOString(), net_secs: netSecs, status: 'completed' }).eq('id', sessionId)
      }

      if (markDone) {
        if (!IS_DEMO) {
          await supabase!.from('tasks').update({ status: 'done', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', session.taskId)
        }
        updateTask(session.taskId, { status: 'done', completed_at: new Date().toISOString() })
      } else {
        if (!IS_DEMO) {
          await supabase!.from('tasks').update({ status: 'todo', updated_at: new Date().toISOString() }).eq('id', session.taskId)
        }
        updateTask(session.taskId, { status: 'todo' })
      }

      removeSession(sessionId)

      if (IS_DEMO) {
        setTimeout(() => {
          localStorage.setItem('kira_demo_tasks', JSON.stringify(useTaskStore.getState().tasks))
        }, 0)
      }
    },
    [sessions, removeSession, updateTask]
  )

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null
  const pausedSessions = sessions.filter((s) => s.status === 'paused')

  return {
    sessions,
    activeSession,
    pausedSessions,
    activeSessionId,
    startTimer,
    handlePause,
    handleResume,
    stopTimer,
  }
}
