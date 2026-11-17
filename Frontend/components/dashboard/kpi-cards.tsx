'use client'

import Link from 'next/link'
import { Activity, ArrowUpRight, Gauge, ListChecks, TriangleAlert } from 'lucide-react'
import { StatusDot } from '@/components/layout/status-dot'
import { HEALTH_COPY, useHealth } from '@/hooks/use-health'
import { formatProbability, isReadmitted } from '@/lib/format'
import type { PredictionRecord } from '@/lib/types'
import { cn } from '@/lib/utils'

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  className,
  children,
}: {
  icon: typeof Activity
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn('relative flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="text-3xl font-semibold tracking-tight tabular">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      {children}
    </div>
  )
}

export function KpiCards({ records, demo }: { records: PredictionRecord[]; demo: boolean }) {
  const { state } = useHealth()
  const total = records.length
  const positives = records.filter((r) => isReadmitted(r.result.prediction_label)).length
  const avg = total ? records.reduce((a, r) => a + r.result.probability_readmitted_30d, 0) / total : null
  const scope = demo ? 'demo records' : 'saved live records'

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi icon={ListChecks} label="Total predictions" value={total} sub={`From ${scope} in this browser`} />
      <Kpi
        icon={TriangleAlert}
        label="Predicted readmissions"
        value={positives}
        sub={total ? `${Math.round((positives / total) * 100)}% of ${total} predictions` : 'No predictions yet'}
      />
      <Kpi icon={Gauge} label="Avg. readmission probability" value={avg === null ? '—' : formatProbability(avg)} sub="Mean of probability_readmitted_30d" />
      <Kpi
        icon={Activity}
        label="Backend status"
        value={
          <span className="flex items-center gap-2.5 text-xl">
            <StatusDot state={state} />
            {HEALTH_COPY[state].label}
          </span>
        }
        sub={HEALTH_COPY[state].description}
      >
        <Link
          href="/model-status"
          className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open Model & API Status"
        />
        <ArrowUpRight className="absolute right-5 bottom-5 size-4 text-muted-foreground" aria-hidden="true" />
      </Kpi>
    </div>
  )
}
