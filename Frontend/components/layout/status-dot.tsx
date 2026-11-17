import { cn } from '@/lib/utils'
import type { HealthState } from '@/lib/types'

const COLORS: Record<HealthState, string> = {
  checking: 'bg-muted-foreground',
  ready: 'bg-success',
  degraded: 'bg-warning',
  not_ready: 'bg-warning',
  unreachable: 'bg-destructive',
  not_configured: 'bg-warning',
}

export function StatusDot({ state, className }: { state: HealthState; className?: string }) {
  return (
    <span className={cn('relative flex size-2', className)} aria-hidden="true">
      {(state === 'ready' || state === 'checking') && (
        <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', COLORS[state])} />
      )}
      <span className={cn('relative inline-flex size-2 rounded-full', COLORS[state])} />
    </span>
  )
}
