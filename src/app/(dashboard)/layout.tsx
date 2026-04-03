'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useUser } from '@/lib/hooks/useUser'
import { TopBar } from '@/components/layout/TopBar'
import { AppDock } from '@/components/layout/AppDock'
import { TimerFloat } from '@/components/layout/TimerFloat'
import { TaskModal } from '@/components/tasks/TaskModal'
import { TaskCloseModal } from '@/components/tasks/TaskCloseModal'
import { TimerStopModal } from '@/components/timer/TimerStopModal'
import { MeetingModal } from '@/components/meetings/MeetingModal'
import { Onboarding } from '@/components/onboarding/Onboarding'
import { useUIStore } from '@/stores/uiStore'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { openModal } = useUIStore()
  const { user, loading } = useUser()
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Show onboarding for new users
  useEffect(() => {
    if (!loading && user && !user.onboarding_completed) {
      setShowOnboarding(true)
    }
  }, [loading, user])

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
      <main className="pt-[calc(4rem+env(safe-area-inset-top))] md:pt-14 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8 max-w-[1400px] mx-auto">
        {children}
      </main>

      {/* Mobile app dock */}
      <AppDock />

      {/* Global floating elements */}
      <TimerFloat />

      {/* Global modals */}
      <TaskModal />
      <TaskCloseModal />
      <TimerStopModal />
      <MeetingModal />

      {/* Onboarding overlay */}
      <AnimatePresence>
        {showOnboarding && user && (
          <Onboarding
            userId={user.id}
            onComplete={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
