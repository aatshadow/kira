'use client'

import Image from 'next/image'
import { Mic, Radio } from 'lucide-react'

export function KiraTalk() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="relative mb-8">
        <Image
          src="/logo.png"
          alt="KIRA"
          width={120}
          height={120}
          className="rounded-full"
        />
        <div className="absolute inset-0 rounded-full border-2 border-[#00D4FF]/20 animate-ping" />
        <div className="absolute inset-[-8px] rounded-full border border-[#00D4FF]/10" />
      </div>

      <h2 className="text-lg font-semibold text-foreground mb-2">Habla con KIRA</h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-md">
        Conversación por voz bidireccional. Habla con KIRA como si fuera tu asistente personal — ella te escucha y te responde.
      </p>

      <div className="flex flex-col items-center gap-4">
        <button
          disabled
          className="h-20 w-20 rounded-full bg-[rgba(0,212,255,0.1)] border-2 border-[#00D4FF]/30 flex items-center justify-center transition-all hover:bg-[rgba(0,212,255,0.2)] hover:border-[#00D4FF]/50 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] cursor-not-allowed opacity-50"
        >
          <Mic className="h-8 w-8 text-[#00D4FF]" />
        </button>
        <p className="text-xs text-muted-foreground">Pulsa para hablar</p>
      </div>

      <div className="mt-12 rounded-lg border border-border bg-card/50 p-4 max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <Radio className="h-4 w-4 text-[#00D4FF]" />
          <span className="text-xs font-medium text-foreground">Próximamente</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          La conversación por voz con KIRA se activará cuando conectes ElevenLabs. Podrás hablar de forma natural y KIRA te responderá con voz.
        </p>
      </div>
    </div>
  )
}
