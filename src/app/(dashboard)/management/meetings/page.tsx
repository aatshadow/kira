'use client'

import { useState } from 'react'
import { Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MeetingCard } from '@/components/meetings/MeetingCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { useMeetings } from '@/lib/hooks/useMeetings'
import { useUIStore } from '@/stores/uiStore'
import type { Meeting } from '@/types/meeting'

export default function ManagementMeetingsPage() {
  const { meetings, editMeeting, deleteMeeting } = useMeetings()
  const { openModal } = useUIStore()
  const [tab, setTab] = useState('upcoming')

  const upcoming = meetings.filter((m) => m.status === 'scheduled' || m.status === 'in_progress')
  const completed = meetings.filter((m) => m.status === 'completed')
  const cancelled = meetings.filter((m) => m.status === 'cancelled')

  const handleEdit = (meeting: Meeting) => openModal('meeting-edit', { meeting })
  const handleComplete = async (meeting: Meeting) => {
    await editMeeting(meeting.id, { status: 'completed' })
    openModal('meeting-edit', { meeting: { ...meeting, status: 'completed' } })
  }
  const handleCancel = async (meeting: Meeting) => await editMeeting(meeting.id, { status: 'cancelled' })
  const handleDelete = async (meeting: Meeting) => await deleteMeeting(meeting.id)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-foreground">Meetings</h2>
        <Button onClick={() => openModal('meeting-create')} className="bg-[#00D4FF] text-black hover:bg-[#00A8CC] hover:shadow-[0_0_8px_rgba(0,212,255,0.4)]">
          <Plus className="h-4 w-4 mr-1" /> Nuevo meeting
        </Button>
      </div>

      {meetings.length === 0 ? (
        <EmptyState icon={Calendar} title="Sin meetings registrados" description="Crea meetings manualmente o conecta Google Calendar" actionLabel="+ Nuevo meeting" onAction={() => openModal('meeting-create')} />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v || 'upcoming')}>
          <TabsList className="bg-secondary mb-4">
            <TabsTrigger value="upcoming">Próximos ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="completed">Completados ({completed.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelados ({cancelled.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-2">
            {upcoming.length === 0 ? <p className="text-sm text-muted-foreground py-4">No hay meetings próximos</p> : upcoming.map((m) => <MeetingCard key={m.id} meeting={m} onEdit={handleEdit} onComplete={handleComplete} onCancel={handleCancel} onDelete={handleDelete} />)}
          </TabsContent>
          <TabsContent value="completed" className="space-y-2">
            {completed.length === 0 ? <p className="text-sm text-muted-foreground py-4">No hay meetings completados</p> : completed.map((m) => <MeetingCard key={m.id} meeting={m} onEdit={handleEdit} onComplete={handleComplete} onCancel={handleCancel} onDelete={handleDelete} />)}
          </TabsContent>
          <TabsContent value="cancelled" className="space-y-2">
            {cancelled.length === 0 ? <p className="text-sm text-muted-foreground py-4">No hay meetings cancelados</p> : cancelled.map((m) => <MeetingCard key={m.id} meeting={m} onEdit={handleEdit} onComplete={handleComplete} onCancel={handleCancel} onDelete={handleDelete} />)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
