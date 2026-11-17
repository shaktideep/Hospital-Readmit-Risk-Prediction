'use client'

import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { setDemoMode, useDemoMode } from '@/hooks/use-demo-mode'
import { Sidebar } from './sidebar-nav'
import { TopBar } from './top-bar'

function DemoBanner() {
  const demo = useDemoMode()
  if (!demo) return null
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs font-semibold tracking-wide text-warning"
    >
      <span className="flex items-center gap-1.5">
        <FlaskConical className="size-3.5" aria-hidden="true" />
        DEMO DATA — NOT A LIVE MODEL RESULT
      </span>
      <button
        type="button"
        onClick={() => setDemoMode(false)}
        className="rounded underline underline-offset-2 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-ring print:hidden"
      >
        Switch to live mode
      </button>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="flex min-h-dvh">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <DemoBanner />
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
