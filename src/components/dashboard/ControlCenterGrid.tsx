'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Terminal, Code2, Video, MessageCircle, Users, ListTodo, BarChart3, Plus } from 'lucide-react'
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
  action?: () => void
  enabled: boolean
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
    { id: 'terminal', label: 'Terminal', subtitle: 'Pronto', icon: Terminal, color: '#22C55A', enabled: false },
    { id: 'claude', label: 'Claude Code', subtitle: 'Pronto', icon: Code2, color: '#8B5CF6', enabled: false },
    { id: 'meetings', label: 'Meetings', subtitle: todayMeetings > 0 ? `${todayMeetings} hoy` : 'Sin meetings', icon: Video, color: '#3B82F6', href: '/management/meetings', enabled: true, badge: todayMeetings || undefined },
    { id: 'whatsapp', label: 'WhatsApp', subtitle: 'Mensajes', icon: MessageCircle, color: '#25D366', href: '/kira', enabled: true },
    { id: 'crm', label: 'CRM', subtitle: 'Pronto', icon: Users, color: '#F97316', enabled: false },
    { id: 'tasks', label: 'Tasks', subtitle: pendingTasks > 0 ? `${pendingTasks} pendientes` : 'Todo al día', icon: ListTodo, color: '#00D4FF', href: '/management/tasks', enabled: true, badge: pendingTasks || undefined },
    { id: 'analytics', label: 'Analytics', subtitle: 'Métricas', icon: BarChart3, color: '#888', href: '/analytics', enabled: true },
    { id: 'create', label: 'Crear...', subtitle: 'Task, meeting, nota', icon: Plus, color: '#00D4FF', action: () => openModal('task-create'), enabled: true, colSpan: 2 },
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
        const isCreate = mod.id === 'create'

        return (
          <motion.button
            key={mod.id}
            variants={floatUp}
            whileTap={mod.enabled ? tapBounce : undefined}
            onClick={() => {
              if (!mod.enabled) return
              if (mod.action) mod.action()
              else if (mod.href) router.push(mod.href)
            }}
            className={`glass-card glow-bleed relative flex flex-col items-start p-4 text-left cursor-pointer transition-all ${
              mod.colSpan === 2 ? 'col-span-2' : ''
            } ${!mod.enabled ? 'opacity-50' : ''}`}
            style={{ borderRadius: isCreate ? 24 : 24 }}
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

            {/* "Pronto" tag for disabled */}
            {!mod.enabled && (
              <span className="absolute top-3 right-3 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full">
                Pronto
              </span>
            )}

            {/* Create gradient accent */}
            {isCreate && (
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.04) 0%, rgba(139,92,246,0.04) 100%)' }}
              />
            )}
          </motion.button>
        )
      })}
    </motion.div>
  )
}
