import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jarvisProxy } from '@/lib/jarvis/proxy'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await jarvisProxy('/v1/models')
  const data = await res.json()
  return NextResponse.json(data)
}
