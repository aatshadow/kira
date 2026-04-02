'use client'

import { motion } from 'framer-motion'
import { Bot, Plug, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fadeUp, staggerContainer } from '@/lib/animations'
import { KiraLogo } from '@/components/shared/KiraLogo'

const PLANNED_AGENTS = [
  { name: 'Google Calendar', description: 'Crear, editar y consultar eventos del calendario', status: 'active' as const, icon: '📅' },
  { name: 'Gmail', description: 'Leer, enviar y gestionar correos electrónicos', status: 'planned' as const, icon: '📧' },
  { name: 'Notion', description: 'Gestionar documentos, bases de datos y wikis', status: 'planned' as const, icon: '📝' },
  { name: 'WhatsApp', description: 'Enviar mensajes y consultar conversaciones', status: 'planned' as const, icon: '💬' },
  { name: 'Calendly', description: 'Gestionar disponibilidad y agendar meetings', status: 'planned' as const, icon: '🗓️' },
  { name: 'Slack', description: 'Enviar mensajes y gestionar canales', status: 'planned' as const, icon: '💼' },
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
    <motion.div
      className="h-full overflow-y-auto"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
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
      </motion.div>

      {/* Architecture info */}
      <motion.div variants={fadeUp} className="rounded-lg border border-border bg-card/50 p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-[rgba(0,212,255,0.08)] flex items-center justify-center shrink-0">
            <KiraLogo size="sm" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-1">KIRA como COO</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              KIRA coordina todos los agentes. Tú le das instrucciones en lenguaje natural y ella decide qué agentes activar, qué acciones ejecutar, y te reporta los resultados. Cada agente conecta con una herramienta externa vía MCP (Model Context Protocol) o API directa.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Agent grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PLANNED_AGENTS.map((agent, i) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -2, borderColor: 'rgba(0,212,255,0.2)' }}
            className="rounded-lg border border-border bg-card/50 p-4 transition-colors cursor-default"
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
              {agent.status === 'active' && (
                <motion.span
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* How it works */}
      <motion.div variants={fadeUp} className="mt-6 rounded-lg border border-dashed border-border p-4">
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
          ].map((item, i) => (
            <motion.div
              key={item.step}
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
            >
              <div className="h-5 w-5 rounded-full bg-[rgba(0,212,255,0.1)] flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-[#00D4FF]">{item.step}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
