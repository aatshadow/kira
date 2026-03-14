'use client'

import Image from 'next/image'
import { Bot, Plug, CircleDot, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PLANNED_AGENTS = [
  {
    name: 'Google Calendar',
    description: 'Crear, editar y consultar eventos del calendario',
    status: 'active' as const,
    icon: '📅',
  },
  {
    name: 'Gmail',
    description: 'Leer, enviar y gestionar correos electrónicos',
    status: 'planned' as const,
    icon: '📧',
  },
  {
    name: 'Notion',
    description: 'Gestionar documentos, bases de datos y wikis',
    status: 'planned' as const,
    icon: '📝',
  },
  {
    name: 'WhatsApp',
    description: 'Enviar mensajes y consultar conversaciones',
    status: 'planned' as const,
    icon: '💬',
  },
  {
    name: 'Calendly',
    description: 'Gestionar disponibilidad y agendar meetings',
    status: 'planned' as const,
    icon: '🗓️',
  },
  {
    name: 'Slack',
    description: 'Enviar mensajes y gestionar canales',
    status: 'planned' as const,
    icon: '💼',
  },
]

const STATUS_COLORS = {
  active: 'text-emerald-400 bg-emerald-400/10',
  planned: 'text-muted-foreground bg-secondary',
  error: 'text-red-400 bg-red-400/10',
}

const STATUS_LABELS = {
  active: 'Activo',
  planned: 'Pendiente',
  error: 'Error',
}

export function KiraAgents() {
  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Agentes & Integraciones</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Conecta herramientas externas para que KIRA pueda operar en ellas
          </p>
        </div>
        <Button
          disabled
          size="sm"
          className="bg-[#00D4FF] text-black hover:bg-[#00A8CC] disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Añadir agente
        </Button>
      </div>

      {/* Architecture info */}
      <div className="rounded-lg border border-border bg-card/50 p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-[rgba(0,212,255,0.08)] flex items-center justify-center shrink-0">
            <Image src="/logo.png" alt="KIRA" width={24} height={24} className="rounded-full" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-1">KIRA como COO</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              KIRA coordina todos los agentes. Tú le das instrucciones en lenguaje natural y ella decide qué agentes activar, qué acciones ejecutar, y te reporta los resultados. Cada agente conecta con una herramienta externa vía MCP (Model Context Protocol) o API directa.
            </p>
          </div>
        </div>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PLANNED_AGENTS.map((agent) => (
          <div
            key={agent.name}
            className="rounded-lg border border-border bg-card/50 p-4 hover:border-border/80 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{agent.icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{agent.name}</p>
                  <p className="text-[11px] text-muted-foreground">{agent.description}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[agent.status]}`}>
                {STATUS_LABELS[agent.status]}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
              <Plug className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {agent.status === 'active' ? 'Conectado via OAuth' : 'MCP Server requerido'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mt-6 rounded-lg border border-dashed border-border p-4">
        <h3 className="text-xs font-medium text-foreground mb-3 flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5 text-[#00D4FF]" />
          Cómo funciona
        </h3>
        <div className="space-y-2">
          {[
            { step: '1', text: 'Conectas un agente (API key o OAuth)' },
            { step: '2', text: 'KIRA detecta qué agente necesita para tu petición' },
            { step: '3', text: 'Ejecuta la acción y te confirma el resultado' },
            { step: '4', text: 'Puedes monitorizar todo desde este panel' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-[rgba(0,212,255,0.1)] flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-[#00D4FF]">{item.step}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
