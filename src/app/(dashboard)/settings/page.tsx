'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Target, Layers, FolderKanban, Hash, Plug, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProfileSettings } from '@/components/settings/ProfileSettings'
import { GoalsSettings } from '@/components/settings/GoalsSettings'
import { CategoriesSettings } from '@/components/settings/CategoriesSettings'
import { ProjectsSettings } from '@/components/settings/ProjectsSettings'
import { TagsSettings } from '@/components/settings/TagsSettings'
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings'
import { AccountSettings } from '@/components/settings/AccountSettings'
import { PageWrapper } from '@/components/shared/PageWrapper'
import { fadeUp, fadeIn } from '@/lib/animations'

const sections = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'goals', label: 'Objetivos', icon: Target },
  { id: 'categories', label: 'Categorías', icon: Layers },
  { id: 'projects', label: 'Proyectos', icon: FolderKanban },
  { id: 'tags', label: 'Tags', icon: Hash },
  { id: 'integrations', label: 'Integraciones', icon: Plug },
  { id: 'account', label: 'Cuenta', icon: Shield },
] as const

const sectionComponents: Record<string, React.FC> = {
  profile: ProfileSettings,
  goals: GoalsSettings,
  categories: CategoriesSettings,
  projects: ProjectsSettings,
  tags: TagsSettings,
  integrations: IntegrationsSettings,
  account: AccountSettings,
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string>('profile')

  const ActiveComponent = sectionComponents[activeSection]

  return (
    <PageWrapper className="py-8">
      <motion.h1 variants={fadeUp} className="text-xl font-bold text-foreground mb-6">
        Settings
      </motion.h1>

      {/* Mobile: horizontal scrollable pill bar */}
      <motion.nav
        variants={fadeUp}
        className="md:hidden flex gap-2 overflow-x-auto pb-4 scrollbar-none -mx-1 px-1"
      >
        {sections.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'relative flex items-center gap-1.5 shrink-0 px-3.5 py-2 text-sm rounded-2xl transition-colors cursor-pointer whitespace-nowrap',
                activeSection === s.id
                  ? 'bg-white/[0.08] border border-white/[0.1] text-[#00D4FF]'
                  : 'bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.05]'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          )
        })}
      </motion.nav>

      <motion.div variants={fadeUp} className="flex gap-8">
        {/* Desktop sidebar nav */}
        <nav className="hidden md:block w-[200px] shrink-0 space-y-1 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'relative flex items-center gap-2 w-full px-3 py-2 text-sm rounded-xl transition-colors cursor-pointer text-left',
                  activeSection === s.id
                    ? 'text-[#00D4FF]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                )}
              >
                {activeSection === s.id && (
                  <motion.div
                    layoutId="settings-nav"
                    className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-xl"
                    transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {s.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Content with transition */}
        <div className="flex-1 max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              variants={fadeIn}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
              {ActiveComponent && <ActiveComponent />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </PageWrapper>
  )
}
