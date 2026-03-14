'use client'

import { Trash2 } from 'lucide-react'
import { useTaskStore } from '@/stores/taskStore'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO } from '@/lib/demo'

export function TagsSettings() {
  const { tags, removeTag } = useTaskStore()
  const supabase = IS_DEMO ? null : createClient()

  const handleDelete = async (id: string) => {
    if (IS_DEMO) { removeTag(id); return }
    await supabase!.from('tags').delete().eq('id', id)
    removeTag(id)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Tags</h2>
      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay tags creados. Se crean automáticamente al asignarlos a tasks.
        </p>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary transition-colors">
              <span className="text-sm text-foreground">#{tag.name}</span>
              <button onClick={() => handleDelete(tag.id)} className="text-muted-foreground hover:text-destructive cursor-pointer transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
