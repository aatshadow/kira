'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { KiraChat } from '@/components/kira/KiraChat'

function KiraPageInner() {
  const searchParams = useSearchParams()
  const convId = searchParams.get('conv')
  const tab = searchParams.get('tab')

  return (
    <div
      className="px-4 md:px-8 py-2 md:py-4 flex flex-col max-w-[900px] mx-auto"
      style={{ height: 'calc(100vh - 8rem)' }}
    >
      <KiraChat initialConversationId={convId} initialTab={tab} />
    </div>
  )
}

export default function KiraPage() {
  return (
    <Suspense>
      <KiraPageInner />
    </Suspense>
  )
}
