'use client'

import { Calendar, Clock, Users, MoreHorizontal, FileText, Sparkles, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Meeting } from '@/types/meeting'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface MeetingCardProps {
  meeting: Meeting
  onEdit: (meeting: Meeting) => void
  onComplete: (meeting: Meeting) => void
  onCancel: (meeting: Meeting) => void
  onDelete: (meeting: Meeting) => void
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress: 'bg-[rgba(0,212,255,0.08)] text-[#00D4FF] border-[rgba(0,212,255,0.25)]',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const statusLabels: Record<string, string> = {
  scheduled: 'Programado',
  in_progress: 'En curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export function MeetingCard({ meeting, onEdit, onComplete, onCancel, onDelete }: MeetingCardProps) {
  return (
    <div
      className="group flex items-center gap-4 p-4 rounded-lg border border-border hover:border-muted-foreground/30 bg-card transition-all cursor-pointer"
      onClick={() => onEdit(meeting)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium text-foreground truncate">{meeting.title}</h3>
          <Badge variant="outline" className={`text-[10px] ${statusColors[meeting.status]}`}>
            {statusLabels[meeting.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          {meeting.scheduled_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(meeting.scheduled_at), 'd MMM, HH:mm', { locale: es })}
            </span>
          )}
          {meeting.duration_mins && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {meeting.duration_mins}min
            </span>
          )}
          {meeting.participants && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {meeting.participants}
            </span>
          )}
          {meeting.google_meet_url && (
            <a
              href={meeting.google_meet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#4285F4] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Video className="h-3 w-3" />
              Meet
            </a>
          )}
          {meeting.status === 'completed' && (
            meeting.transcript ? (
              <span className="flex items-center gap-1 text-green-400">
                <FileText className="h-3 w-3" />
                Transcripcion
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <FileText className="h-3 w-3" />
                Sin transcripcion
              </span>
            )
          )}
          {meeting.ai_summary && (
            <span className="flex items-center gap-1 text-purple-400">
              <Sparkles className="h-3 w-3" />
              Resumen AI
            </span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="p-1 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(meeting)}>Editar</DropdownMenuItem>
          {(meeting.status === 'scheduled' || meeting.status === 'in_progress') && (
            <DropdownMenuItem onClick={() => onComplete(meeting)}>
              Marcar completado
            </DropdownMenuItem>
          )}
          {meeting.status !== 'cancelled' && meeting.status !== 'completed' && (
            <DropdownMenuItem onClick={() => onCancel(meeting)} className="text-destructive">
              Cancelar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onDelete(meeting)} className="text-destructive">
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
