'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquareText, Mic, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KiraChat } from '@/components/kira/KiraChat'
import { KiraTalk } from '@/components/kira/KiraTalk'
import { KiraAgents } from '@/components/kira/KiraAgents'
import { fadeUp } from '@/lib/animations'
import { KiraLogo } from '@/components/shared/KiraLogo'

const tabs = [
  { id: 'chat', label: 'Chat', icon: MessageSquareText },
  { id: 'talk', label: 'Talk', icon: Mic },
  { id: 'agents', label: 'Agentes', icon: Bot },
] as const

type TabId = (typeof tabs)[number]['id']

function KiraPageInner() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam === 'agents' ? 'agents' : tabParam === 'talk' ? 'talk' : 'chat'
  )

  useEffect(() => {
    if (tabParam === 'agents') setActiveTab('agents')
    else if (tabParam === 'talk') setActiveTab('talk')
  }, [tabParam])

  return (
    <motion.div
      className="px-4 md:px-8 py-2 md:py-6 flex flex-col max-w-[900px] mx-auto"
      style={{ height: 'calc(100vh - 4.5rem)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <motion.div
          className="hidden md:flex items-center gap-3"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <KiraLogo size="md" />
          <div>
            <h1 className="text-lg font-bold text-foreground">KIRA</h1>
            <p className="text-[11px] text-muted-foreground">Tu asistente de productividad</p>
          </div>
        </motion.div>

        {/* Tab bar — glass pill */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm w-full md:w-auto relative">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 md:py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer z-10',
                  activeTab === tab.id
                    ? 'text-[#00D4FF]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="kira-tab"
                    className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-xl"
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

export default function KiraPage() {
  return (
    <Suspense>
      <KiraPageInner />
    </Suspense>
  )
}
