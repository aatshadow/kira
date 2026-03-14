'use client'

import { Plus } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { usePathname } from 'next/navigation'

export function CreateTaskFAB() {
  const { openModal } = useUIStore()
  const pathname = usePathname()

  if (pathname.startsWith('/settings') || pathname.startsWith('/kira')) return null

  return (
    <button
      onClick={() => openModal('task-create')}
      className="fixed bottom-6 right-6 md:bottom-6 md:left-6 md:right-auto z-[150] h-12 w-12 rounded-full bg-[#00D4FF] text-black flex items-center justify-center shadow-lg hover:bg-[#00A8CC] hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all cursor-pointer"
      title="Nueva task (C)"
    >
      <Plus className="h-5 w-5" />
    </button>
  )
}
