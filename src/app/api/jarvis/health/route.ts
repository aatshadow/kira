import { NextResponse } from 'next/server'
import { jarvisProxy } from '@/lib/jarvis/proxy'

export async function GET() {
  try {
    const res = await jarvisProxy('/health')
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ status: 'offline' }, { status: 503 })
  }
}
