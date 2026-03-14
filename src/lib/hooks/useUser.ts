'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO } from '@/lib/demo'

interface UserProfile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  daily_goal_hours: number
  weekly_goal_hours: number
  work_days: number[]
  theme: string
  default_view: string
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (IS_DEMO) {
      setUser({
        id: 'demo',
        email: 'demo@kira.app',
        name: 'Demo',
        avatar_url: null,
        daily_goal_hours: 8,
        weekly_goal_hours: 40,
        work_days: [1, 2, 3, 4, 5],
        theme: 'dark',
        default_view: 'list',
      })
      setLoading(false)
      return
    }

    const supabase = createClient()

    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }

      // Ensure profile exists (upsert)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (!profile) {
        // Create profile if missing (user was created before trigger)
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({ id: authUser.id, name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '' })
          .select()
          .single()

        if (newProfile) {
          // Also seed default categories
          await supabase.from('categories').insert([
            { user_id: authUser.id, name: 'Development', is_default: true },
            { user_id: authUser.id, name: 'Security', is_default: true },
            { user_id: authUser.id, name: 'Growth', is_default: true },
            { user_id: authUser.id, name: 'Admin', is_default: true },
            { user_id: authUser.id, name: 'Personal', is_default: true },
          ])

          setUser({
            id: authUser.id,
            email: authUser.email || '',
            name: newProfile.name,
            avatar_url: newProfile.avatar_url,
            daily_goal_hours: newProfile.daily_goal_hours || 8,
            weekly_goal_hours: newProfile.weekly_goal_hours || 40,
            work_days: newProfile.work_days || [1, 2, 3, 4, 5],
            theme: newProfile.theme || 'dark',
            default_view: newProfile.default_view || 'list',
          })
        }
      } else {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: profile.name,
          avatar_url: profile.avatar_url,
          daily_goal_hours: profile.daily_goal_hours || 8,
          weekly_goal_hours: profile.weekly_goal_hours || 40,
          work_days: profile.work_days || [1, 2, 3, 4, 5],
          theme: profile.theme || 'dark',
          default_view: profile.default_view || 'list',
        })
      }

      setLoading(false)
    }

    load()
  }, [])

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (IS_DEMO || !user) return
    const supabase = createClient()
    await supabase.from('profiles').update({ ...data, updated_at: new Date().toISOString() }).eq('id', user.id)
    setUser((prev) => prev ? { ...prev, ...data } : prev)
  }

  return { user, loading, updateProfile }
}
