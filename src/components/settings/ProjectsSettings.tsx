'use client'

import { useState } from 'react'
import { Plus, Archive, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTaskStore } from '@/stores/taskStore'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO, demoId } from '@/lib/demo'

export function ProjectsSettings() {
  const { projects, addProject, removeProject } = useTaskStore()
  const [newName, setNewName] = useState('')
  const supabase = IS_DEMO ? null : createClient()

  const handleAdd = async () => {
    if (!newName.trim()) return
    if (IS_DEMO) {
      addProject({ id: demoId(), user_id: 'demo', name: newName.trim(), description: null, category_id: null, is_archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      setNewName('')
      return
    }
    const { data } = await supabase!.from('projects').insert({ name: newName.trim() }).select().single()
    if (data) {
      addProject(data)
      setNewName('')
    }
  }

  const handleArchive = async (id: string) => {
    if (IS_DEMO) { removeProject(id); return }
    await supabase!.from('projects').update({ is_archived: true }).eq('id', id)
    removeProject(id)
  }

  const handleDelete = async (id: string) => {
    if (IS_DEMO) { removeProject(id); return }
    await supabase!.from('projects').delete().eq('id', id)
    removeProject(id)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Proyectos</h2>
      <div className="space-y-2">
        {projects.map((proj) => (
          <div key={proj.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary transition-colors">
            <span className="text-sm text-foreground">{proj.name}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => handleArchive(proj.id)} className="text-muted-foreground hover:text-foreground cursor-pointer p-1" title="Archivar">
                <Archive className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleDelete(proj.id)} className="text-muted-foreground hover:text-destructive cursor-pointer p-1" title="Eliminar">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 max-w-sm">
        <Input placeholder="Nuevo proyecto" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} className="bg-secondary" />
        <Button onClick={handleAdd} variant="secondary" size="sm"><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}
