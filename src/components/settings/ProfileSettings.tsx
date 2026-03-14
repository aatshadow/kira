'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUser } from '@/lib/hooks/useUser'

export function ProfileSettings() {
  const { user, updateProfile } = useUser()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user?.name])

  const handleSave = async () => {
    setSaving(true)
    await updateProfile({ name })
    setSaving(false)
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
          <Input value={user?.email || ''} disabled className="max-w-sm bg-secondary opacity-60" />
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-[#00D4FF] text-black hover:bg-[#00A8CC]">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}
