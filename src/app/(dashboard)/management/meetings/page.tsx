'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MeetingCard } from '@/components/meetings/MeetingCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { useMeetings } from '@/lib/hooks/useMeetings'
import { useUIStore } from '@/stores/uiStore'
import { DayStrip } from '@/components/management/DayStrip'
import { PageWrapper } from '@/components/shared/PageWrapper'
import { fadeUp } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { Meeting } from '@/types/meeting'

const tabItems = [
  { id: 'upcoming', label: 'Próximos' },
  { id: 'completed', label: 'Completados' },
  { id: 'cancelled', label: 'Cancelados' },
] as const

export default function ManagementMeetingsPage() {
  const { meetings, editMeeting, deleteMeeting } = useMeetings()
  const { openModal } = useUIStore()
  const [tab, setTab] = useState('upcoming')

  const upcoming = meetings.filter((m) => m.status === 'scheduled' || m.status === 'in_progress')
  const completed = meetings.filter((m) => m.status === 'completed')
  const cancelled = meetings.filter((m) => m.status === 'cancelled')

  const counts: Record<string, number> = { upcoming: upcoming.length, completed: completed.length, cancelled: cancelled.length }
  const lists: Record<string, Meeting[]> = { upcoming, completed, cancelled }

  const handleEdit = (meeting: Meeting) => openModal('meeting-edit', { meeting })
  const handleComplete = async (meeting: Meeting) => {
    await editMeeting(meeting.id, { status: 'completed' })
    openModal('meeting-edit', { meeting: { ...meeting, status: 'completed' } })
  }
  const handleCancel = async (meeting: Meeting) => await editMeeting(meeting.id, { status: 'cancelled' })
  const handleDelete = async (meeting: Meeting) => await deleteMeeting(meeting.id)

  return (
    <PageWrapper>
      <DayStrip />
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-foreground">Meetings</h2>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button onClick={() => openModal('meeting-create')} className="bg-[#00D4FF] text-black hover:bg-[#00A8CC] hover:shadow-[0_0_8px_rgba(0,212,255,0.4)]">
            <Plus className="h-4 w-4 mr-1" /> Nuevo meeting
          </Button>
        </motion.div>
      </motion.div>

      {meetings.length === 0 ? (
        <motion.div variants={fadeUp}>
          <EmptyState icon={Calendar} title="Sin meetings registrados" description="Crea meetings manualmente o conecta Google Calendar" actionLabel="+ Nuevo meeting" onAction={() => openModal('meeting-create')} />
        </motion.div>
      ) : (
        <motion.div variants={fadeUp}>
          {/* Tab bar with sliding indicator */}
          <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg mb-4 w-fit">
            {tabItems.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer z-10',
                  tab === t.id ? 'text-[#00D4FF]' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab === t.id && (
                  <motion.div
                    layoutId="meeting-tab"
                    className="absolute inset-0 bg-background rounded-md shadow-sm"
                    transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{t.label} ({counts[t.id]})</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-2"
            >
              {lists[tab].length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Sin meetings en esta categoría</p>
              ) : (
                lists[tab].map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <MeetingCard meeting={m} onEdit={handleEdit} onComplete={handleComplete} onCancel={handleCancel} onDelete={handleDelete} />
                  </motion.div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </PageWrapper>
  )
}
