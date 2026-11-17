import { FlaskConical, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isReadmitted, shortLabel } from '@/lib/format'
import type { PredictionSource } from '@/lib/types'

export function OutcomeBadge({ label, className }: { label: string; className?: string }) {
  const positive = isReadmitted(label)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        positive ? 'border-chart-5/30 bg-chart-5/10 text-chart-5' : 'border-success/30 bg-success/10 text-success',
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', positive ? 'bg-chart-5' : 'bg-success')} aria-hidden="true" />
      {shortLabel(label)}
    </span>
  )
}

export function SourceBadge({ source }: { source: PredictionSource }) {
  if (source === 'demo') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning">
        <FlaskConical className="size-3" aria-hidden="true" />
        Demo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
      <Radio className="size-3" aria-hidden="true" />
      Live
    </span>
  )
}
