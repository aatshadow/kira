import { Badge } from '@/components/ui/badge'
import { Calendar, Mic, MessageCircle } from 'lucide-react'

const integrations = [
  { icon: Calendar, name: 'Google Calendar', desc: 'Sincroniza meetings automáticamente con tu calendario' },
  { icon: Mic, name: 'Fireflies', desc: 'Transcripción automática de meetings y generación de action items' },
  { icon: MessageCircle, name: 'Discord', desc: 'Notificaciones y comandos desde tu servidor Discord' },
]

export function IntegrationsSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Integraciones</h2>
      <div className="space-y-3">
        {integrations.map((int) => {
          const Icon = int.icon
          return (
            <div key={int.name} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card opacity-60">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium text-foreground">{int.name}</h3>
                  <Badge variant="secondary" className="text-[10px]">Próximamente</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{int.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
