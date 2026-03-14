'use client'

import { useState } from 'react'
import { User, Target, Layers, FolderKanban, Hash, Plug, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProfileSettings } from '@/components/settings/ProfileSettings'
import { GoalsSettings } from '@/components/settings/GoalsSettings'
import { CategoriesSettings } from '@/components/settings/CategoriesSettings'
import { ProjectsSettings } from '@/components/settings/ProjectsSettings'
import { TagsSettings } from '@/components/settings/TagsSettings'
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings'
import { AccountSettings } from '@/components/settings/AccountSettings'

const sections = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'goals', label: 'Objetivos', icon: Target },
  { id: 'categories', label: 'Categorías', icon: Layers },
  { id: 'projects', label: 'Proyectos', icon: FolderKanban },
  { id: 'tags', label: 'Tags', icon: Hash },
  { id: 'integrations', label: 'Integraciones', icon: Plug },
  { id: 'account', label: 'Cuenta', icon: Shield },
] as const

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string>('profile')

  return (
    <div className="py-8">
      <h1 className="text-xl font-bold text-foreground mb-6">Settings</h1>

      <div className="flex gap-8">
        {/* Sidebar nav */}
        <nav className="w-[200px] shrink-0 space-y-1">
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors cursor-pointer text-left',
                  activeSection === s.id
                    ? 'bg-[rgba(0,212,255,0.08)] text-[#00D4FF]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            )
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeSection === 'profile' && <ProfileSettings />}
          {activeSection === 'goals' && <GoalsSettings />}
          {activeSection === 'categories' && <CategoriesSettings />}
          {activeSection === 'projects' && <ProjectsSettings />}
          {activeSection === 'tags' && <TagsSettings />}
          {activeSection === 'integrations' && <IntegrationsSettings />}
          {activeSection === 'account' && <AccountSettings />}
        </div>
      </div>
    </div>
  )
}
