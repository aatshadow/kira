'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/uiStore'
import { useTimerStore } from '@/stores/timerStore'
import { useTimer } from '@/lib/hooks/useTimer'
import { formatTime } from '@/lib/utils/time'

export function TimerStopModal() {
  const { activeModal, modalData, closeModal, openModal } = useUIStore()
  const { sessions } = useTimerStore()
  const { stopTimer } = useTimer()

  const isOpen = activeModal === 'timer-stop'
  const sessionId = modalData?.sessionId as string | undefined
  const session = sessions.find((s) => s.id === sessionId)

  if (!isOpen || !session) return null

  const handleCloseSession = async () => {
    await stopTimer(session.id, false)
    closeModal()
  }

  const handleMarkDone = async () => {
    const taskId = session.taskId
    const totalSecs = session.elapsedSecs
    await stopTimer(session.id, true)
    closeModal()
    openModal('task-close', { taskId, totalSecs })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border animate-kira-modal-in">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Cerrar sesión de timer</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="text-center mb-6">
            <p className="text-2xl font-mono text-[#00D4FF] mb-1">
              {formatTime(session.elapsedSecs)}
            </p>
            <p className="text-sm text-muted-foreground">{session.taskTitle}</p>
          </div>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            ¿Qué quieres hacer con esta sesión?
          </p>
          <div className="space-y-2">
            <Button variant="secondary" className="w-full h-11" onClick={handleCloseSession}>
              Solo cerrar sesión — la task sigue pendiente
            </Button>
            <Button
              className="w-full h-11 bg-[#00D4FF] text-black hover:bg-[#00A8CC] hover:shadow-[0_0_8px_rgba(0,212,255,0.4)]"
              onClick={handleMarkDone}
            >
              Marcar task como Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
