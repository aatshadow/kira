'use client'

import { useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { TopBar } from '@/components/layout/TopBar'
import { TimerFloat } from '@/components/layout/TimerFloat'
import { TaskModal } from '@/components/tasks/TaskModal'
import { TaskCloseModal } from '@/components/tasks/TaskCloseModal'
import { TimerStopModal } from '@/components/timer/TimerStopModal'
import { MeetingModal } from '@/components/meetings/MeetingModal'
import { CreateTaskFAB } from '@/components/shared/CreateTaskFAB'
import { useUIStore } from '@/stores/uiStore'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { openModal } = useUIStore()

  // Ensure profile exists on first load
  useUser()

  // Keyboard shortcut: C to create task
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'c' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        openModal('task-create')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openModal])

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="pt-[calc(4rem+env(safe-area-inset-top))] md:pt-14 px-[max(1rem,env(safe-area-inset-left))] md:px-6 lg:px-10 pb-[calc(5rem+env(safe-area-inset-bottom))] max-w-[1400px] mx-auto">
        {children}
      </main>

      {/* Global floating elements */}
      <TimerFloat />
      <CreateTaskFAB />

      {/* Global modals */}
      <TaskModal />
      <TaskCloseModal />
      <TimerStopModal />
      <MeetingModal />
    </div>
  )
}
