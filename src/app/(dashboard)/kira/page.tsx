'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquareText, Mic, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KiraChat } from '@/components/kira/KiraChat'
import { KiraTalk } from '@/components/kira/KiraTalk'
import { KiraAgents } from '@/components/kira/KiraAgents'
import { fadeUp } from '@/lib/animations'

const tabs = [
  { id: 'chat', label: 'Chat', icon: MessageSquareText },
  { id: 'talk', label: 'Talk', icon: Mic },
  { id: 'agents', label: 'Agentes', icon: Bot },
] as const

type TabId = (typeof tabs)[number]['id']

export default function KiraPage() {
  const [activeTab, setActiveTab] = useState<TabId>('chat')

  return (
    <motion.div
      className="py-2 md:py-8 flex flex-col"
      style={{ height: 'calc(100vh - 4.5rem)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <motion.div
          className="hidden md:flex items-center gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Image src="/logo.png" alt="KIRA" width={32} height={32} className="rounded-full" />
          <div>
            <h1 className="text-lg font-bold text-foreground">KIRA</h1>
            <p className="text-[11px] text-muted-foreground">Tu asistente de productividad</p>
          </div>
        </motion.div>

        {/* Tab bar with sliding indicator */}
        <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg w-full md:w-auto relative">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 md:py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer z-10',
                  activeTab === tab.id
                    ? 'text-[#00D4FF]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="kira-tab"
                    className="absolute inset-0 bg-background rounded-md shadow-sm"
                    transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content with AnimatePresence */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            className="h-full"
          >
            {activeTab === 'chat' && <KiraChat />}
            {activeTab === 'talk' && <KiraTalk />}
            {activeTab === 'agents' && <KiraAgents />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
