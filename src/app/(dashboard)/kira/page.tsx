'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MessageSquareText, Mic, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KiraChat } from '@/components/kira/KiraChat'
import { KiraTalk } from '@/components/kira/KiraTalk'
import { KiraAgents } from '@/components/kira/KiraAgents'

const tabs = [
  { id: 'chat', label: 'Chat', icon: MessageSquareText },
  { id: 'talk', label: 'Talk', icon: Mic },
  { id: 'agents', label: 'Agentes', icon: Bot },
] as const

type TabId = (typeof tabs)[number]['id']

export default function KiraPage() {
  const [activeTab, setActiveTab] = useState<TabId>('chat')

  return (
    <div className="py-2 md:py-8 flex flex-col" style={{ height: 'calc(100vh - 4.5rem)' }}>
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        {/* Title - hidden on mobile since TopBar already shows KIRA */}
        <div className="hidden md:flex items-center gap-2">
          <Image src="/logo.png" alt="KIRA" width={32} height={32} className="rounded-full" />
          <div>
            <h1 className="text-lg font-bold text-foreground">KIRA</h1>
            <p className="text-[11px] text-muted-foreground">Tu asistente de productividad</p>
          </div>
        </div>

        {/* Tab bar - full width on mobile */}
        <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg w-full md:w-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 md:py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer',
                  activeTab === tab.id
                    ? 'bg-background text-[#00D4FF] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'chat' && <KiraChat />}
        {activeTab === 'talk' && <KiraTalk />}
        {activeTab === 'agents' && <KiraAgents />}
      </div>
    </div>
  )
}
