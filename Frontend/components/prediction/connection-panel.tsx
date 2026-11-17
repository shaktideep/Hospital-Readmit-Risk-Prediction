'use client'

import { useState } from 'react'
import { FlaskConical, Loader2, Plug, Radio } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { StatusDot } from '@/components/layout/status-dot'
import { HEALTH_COPY, useHealth } from '@/hooks/use-health'
import { setDemoMode, useDemoMode } from '@/hooks/use-demo-mode'
import { API_BASE_URL, API_BASE_URL_CONFIGURED, API_CONFIG_ERROR } from '@/lib/api'
import { cn } from '@/lib/utils'

export function ConnectionPanel() {
  const demo = useDemoMode()
  const { snapshot, state, isChecking, refresh } = useHealth()
  const [testing, setTesting] = useState(false)

  async function testConnection() {
    setTesting(true)
    try {
      const result = await refresh()
      if (result?.state === 'ready') toast.success('Connected', { description: HEALTH_COPY.ready.description })
      else toast.error(HEALTH_COPY[result?.state ?? 'unreachable'].label, { description: result?.error ?? undefined })
    } finally {
      setTesting(false)
    }
  }

  const busy = testing || isChecking

  return (
    <section aria-labelledby="connection-h" className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h3 id="connection-h" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prediction source
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <StatusDot state={state} />
              {HEALTH_COPY[state].label}
            </span>
            {API_BASE_URL_CONFIGURED && (
              <code className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs" title={API_BASE_URL}>
                {API_BASE_URL}
              </code>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground text-pretty">
            {demo
              ? 'Demo Mode is on. Predictions are simulated in this browser and never sent to the model.'
              : snapshot?.error
                ? snapshot.error
                : HEALTH_COPY[state].description}
          </p>
          {demo && API_CONFIG_ERROR && (
            <p role="alert" className="mt-1 text-xs text-warning text-pretty">
              {API_CONFIG_ERROR}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Prediction source" className="flex rounded-lg border p-0.5">
            <button
              type="button"
              aria-pressed={!demo}
              onClick={() => setDemoMode(false)}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                !demo ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Radio className="size-3.5" aria-hidden="true" />
              Live API
            </button>
            <button
              type="button"
              aria-pressed={demo}
              onClick={() => setDemoMode(true)}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                demo ? 'bg-warning/20 text-warning' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <FlaskConical className="size-3.5" aria-hidden="true" />
              Demo Mode
            </button>
          </div>
          <Button type="button" variant="outline" onClick={testConnection} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Plug />}
            Test connection
          </Button>
        </div>
      </div>
    </section>
  )
}
