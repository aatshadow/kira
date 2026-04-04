import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jarvisProxy } from '@/lib/jarvis/proxy'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const res = await jarvisProxy(`/v1/connectors/${id}/sync`, { method: 'POST' })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
