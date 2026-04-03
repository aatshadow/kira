'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Bot, Video, MessageCircle, ListTodo, BarChart3, Plus, ExternalLink, Settings, Inbox } from 'lucide-react'
import { useTaskStore } from '@/stores/taskStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { useUIStore } from '@/stores/uiStore'
import { bentoStagger, floatUp, tapBounce } from '@/lib/animations'

interface Module {
  id: string
  label: string
  subtitle: string
  icon: React.ElementType
  color: string
  href?: string
  externalHref?: string
  action?: () => void
  badge?: number | string
  colSpan?: number
}

export function ControlCenterGrid() {
  const router = useRouter()
  const { tasks } = useTaskStore()
  const { meetings } = useMeetingStore()
  const { openModal } = useUIStore()

  const pendingTasks = tasks.filter((t) => ['todo', 'in_progress'].includes(t.status)).length
  const todayMeetings = meetings.filter((m) => {
    if (!m.scheduled_at) return false
    const d = new Date(m.scheduled_at)
    const now = new Date()
    return d.toDateString() === now.toDateString() && m.status === 'scheduled'
  }).length

  const modules: Module[] = [
    { id: 'kira', label: 'KIRA', subtitle: 'Hablar con KIRA', icon: Bot, color: '#00D4FF', href: '/kira' },
    { id: 'agents', label: 'Agentes', subtitle: 'Integraciones', icon: Settings, color: '#8B5CF6', href: '/kira?tab=agents' },
    { id: 'meetings', label: 'Meetings', subtitle: todayMeetings > 0 ? `${todayMeetings} hoy` : 'Sin meetings', icon: Video, color: '#3B82F6', href: '/management/meetings', badge: todayMeetings || undefined },
    { id: 'inbox', label: 'Inbox', subtitle: 'Todos los mensajes', icon: Inbox, color: '#8B5CF6', href: '/inbox' },
    { id: 'tasks', label: 'Tasks', subtitle: pendingTasks > 0 ? `${pendingTasks} pendientes` : 'Todo al dia', icon: ListTodo, color: '#00D4FF', href: '/management/tasks', badge: pendingTasks || undefined },
    { id: 'analytics', label: 'Analytics', subtitle: 'Metricas', icon: BarChart3, color: '#888', href: '/analytics' },
    { id: 'central', label: 'Consola Central', subtitle: 'Black Wolf', icon: ExternalLink, color: '#F97316', externalHref: 'https://central.blackwolfsec.io', colSpan: 2 },
    { id: 'create', label: 'Crear...', subtitle: 'Task, meeting, nota', icon: Plus, color: '#00D4FF', action: () => openModal('task-create'), colSpan: 2 },
  ]

  return (
    <motion.div
      className="grid grid-cols-2 gap-3"
      variants={bentoStagger}
      initial="hidden"
      animate="show"
    >
      {modules.map((mod) => {
        const Icon = mod.icon
        const isExternal = !!mod.externalHref
        const isCreate = mod.id === 'create'
        const isCentral = mod.id === 'central'

        return (
          <motion.button
            key={mod.id}
            variants={floatUp}
            whileTap={tapBounce}
            onClick={() => {
              if (mod.action) mod.action()
              else if (mod.externalHref) window.open(mod.externalHref, '_blank')
              else if (mod.href) router.push(mod.href)
            }}
            className={`glass-card glow-bleed relative flex flex-col items-start p-4 text-left cursor-pointer transition-all ${
              mod.colSpan === 2 ? 'col-span-2' : ''
            }`}
          >
            {/* Icon container */}
            <div
              className="h-11 w-11 rounded-2xl flex items-center justify-center mb-3"
              style={{ backgroundColor: `${mod.color}15` }}
            >
              <Icon className="h-5 w-5" style={{ color: mod.color }} />
            </div>

            {/* Label */}
            <span className="text-[13px] font-semibold text-foreground leading-tight">{mod.label}</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">{mod.subtitle}</span>

            {/* Badge */}
            {mod.badge && (
              <span
                className="absolute top-3 right-3 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: mod.color }}
              >
                {mod.badge}
              </span>
            )}

            {/* External link indicator */}
            {isExternal && (
              <ExternalLink className="absolute top-3.5 right-3.5 h-3.5 w-3.5 text-muted-foreground/40" />
            )}

            {/* Gradient accent for special cards */}
            {(isCreate || isCentral) && (
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                  background: isCentral
                    ? 'linear-gradient(135deg, rgba(249,115,22,0.04) 0%, rgba(234,88,12,0.02) 100%)'
                    : 'linear-gradient(135deg, rgba(0,212,255,0.04) 0%, rgba(139,92,246,0.04) 100%)'
                }}
              />
            )}
          </motion.button>
        )
      })}
    </motion.div>
  )
}
