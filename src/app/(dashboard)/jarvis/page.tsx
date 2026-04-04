'use client'

import { JarvisShell } from '@/components/jarvis/JarvisShell'

export default function JarvisPage() {
  return (
    <div
      className="px-0 md:px-4 flex flex-col max-w-[1200px] mx-auto w-full"
      style={{ height: 'calc(100dvh - 8rem)' }}
    >
      <JarvisShell />
    </div>
  )
}
