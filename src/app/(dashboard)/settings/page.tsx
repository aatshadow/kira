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

      <motion.div variants={fadeUp} className="flex gap-8">
        {/* Sidebar nav */}
        <nav className="w-[200px] shrink-0 space-y-1">
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'relative flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors cursor-pointer text-left',
                  activeSection === s.id
                    ? 'text-[#00D4FF]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                {activeSection === s.id && (
                  <motion.div
                    layoutId="settings-nav"
                    className="absolute inset-0 bg-[rgba(0,212,255,0.08)] rounded-md"
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
