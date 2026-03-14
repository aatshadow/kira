'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ProfileSettings() {
  const [name, setName] = useState('Alex')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setTimeout(() => setSaving(false), 500)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Perfil</h2>
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Nombre</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm bg-secondary" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
          <Input value="alex@blackwolf.com" disabled className="max-w-sm bg-secondary opacity-60" />
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-[#00D4FF] text-black hover:bg-[#00A8CC]">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}
