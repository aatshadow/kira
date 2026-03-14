'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO } from '@/lib/demo'
import { useRouter } from 'next/navigation'

export function AccountSettings() {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = IS_DEMO ? null : createClient()
  const router = useRouter()

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) return
    if (IS_DEMO) return
    setSaving(true)
    await supabase!.auth.updateUser({ password: newPw })
    setSaving(false)
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
  }

  const handleLogout = async () => {
    if (IS_DEMO) {
      document.cookie = 'kira_session=; path=/; max-age=0'
      router.push('/login')
      return
    }
    await supabase!.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
        <div className="max-w-sm space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Contraseña actual</Label>
            <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="bg-secondary" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Nueva contraseña</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="bg-secondary" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Confirmar</Label>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="bg-secondary" />
          </div>
          <Button onClick={handleChangePassword} disabled={saving || !newPw || newPw !== confirmPw} className="bg-[#00D4FF] text-black hover:bg-[#00A8CC]">
            {saving ? 'Cambiando...' : 'Cambiar contraseña'}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Sesión</h2>
        <Button variant="secondary" onClick={handleLogout}>Cerrar sesión</Button>
      </div>

      <div className="border-t border-destructive/20 pt-6 space-y-4">
        <h2 className="text-lg font-semibold text-destructive">Zona peligrosa</h2>
        <p className="text-xs text-muted-foreground">Escribe ELIMINAR para confirmar la eliminación de todos tus datos.</p>
        <div className="flex gap-2 max-w-sm">
          <Input placeholder="ELIMINAR" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="bg-secondary" />
          <Button variant="destructive" disabled={deleteConfirm !== 'ELIMINAR'} className="border border-destructive/40">
            Eliminar datos
          </Button>
        </div>
      </div>
    </div>
  )
}
