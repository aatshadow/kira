'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useTaskStore } from '@/stores/taskStore'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/getUserId'
import { IS_DEMO, demoId } from '@/lib/demo'

export function CategoriesSettings() {
  const { categories, addCategory, removeCategory } = useTaskStore()
  const [newName, setNewName] = useState('')
  const supabase = IS_DEMO ? null : createClient()

  const handleAdd = async () => {
    if (!newName.trim()) return
    if (IS_DEMO) {
      addCategory({ id: demoId(), user_id: 'demo', name: newName.trim(), is_default: false, created_at: new Date().toISOString() })
      setNewName('')
      return
    }
    const userId = await getUserId()
    const { data } = await supabase!.from('categories').insert({ name: newName.trim(), user_id: userId }).select().single()
    if (data) {
      addCategory(data)
      setNewName('')
    }
  }

  const handleDelete = async (id: string) => {
    if (IS_DEMO) { removeCategory(id); return }
    await supabase!.from('categories').delete().eq('id', id)
    removeCategory(id)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Categorías</h2>
      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between py-2 px-3 hover:bg-white/[0.05] rounded-xl transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">{cat.name}</span>
              {cat.is_default && <Badge variant="secondary" className="text-[10px]">DEFAULT</Badge>}
            </div>
            {!cat.is_default && (
              <button onClick={() => handleDelete(cat.id)} className="text-muted-foreground hover:text-destructive cursor-pointer transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 max-w-sm">
        <Input placeholder="Nueva categoría" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} className="bg-white/[0.06] border-white/[0.1] rounded-xl" />
        <Button onClick={handleAdd} variant="secondary" size="sm" className="rounded-2xl"><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}
