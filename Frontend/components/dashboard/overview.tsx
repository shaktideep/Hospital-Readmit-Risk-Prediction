'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, BrainCircuit, Database, FlaskConical, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { PredictionTable } from '@/components/history/prediction-table'
import { useDemoMode } from '@/hooks/use-demo-mode'
import { buildDemoDataset } from '@/lib/demo'
import { useHistory, useHydrated } from '@/lib/history'
import { cn } from '@/lib/utils'
import { KpiCards } from './kpi-cards'
import { ActivityChart, OutcomeChart, ProbabilityChart } from './charts'

type Dataset = 'live' | 'demo'

function Welcome() {
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-8 shadow-xs md:px-10 md:py-10">
      <div className="bg-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_65%)]" aria-hidden="true" />
      <div className="absolute -top-32 -right-24 size-80 rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <BrainCircuit className="size-3.5 text-primary" aria-hidden="true" />
            XGBoost with FAISS RAG features
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Clinical Intelligence, <span className="text-primary">Made Actionable</span>
          </h2>
          <p className="mt-3 max-w-xl text-base text-muted-foreground text-pretty">
            Estimate 30-day hospital readmission probability using machine learning and retrieval-augmented clinical features.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" render={<Link href="/predict" />} nativeButton={false}>
            <Stethoscope />
            Run New Prediction
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/about" />} nativeButton={false}>
            How it works
            <ArrowRight />
          </Button>
        </div>
      </div>
    </section>
  )
}

function DatasetToggle({ value, onChange }: { value: Dataset; onChange: (d: Dataset) => void }) {
  const opts: { v: Dataset; label: string; icon: typeof Database }[] = [
    { v: 'live', label: 'Live history', icon: Database },
    { v: 'demo', label: 'Demo data', icon: FlaskConical },
  ]
  return (
    <div role="group" aria-label="Analytics dataset" className="flex rounded-lg border bg-muted/40 p-0.5">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            value === o.v && 'bg-background text-foreground shadow-xs',
          )}
        >
          <o.icon className="size-3.5" aria-hidden="true" />
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Overview() {
  const history = useHistory()
  const hydrated = useHydrated()
  const demoMode = useDemoMode()
  const [choice, setChoice] = useState<Dataset | null>(null)
  const dataset: Dataset = choice ?? (demoMode ? 'demo' : 'live')

  const synthetic = useMemo(() => (hydrated ? buildDemoDataset() : []), [hydrated])
  const live = useMemo(() => history.filter((r) => r.source === 'live'), [history])
  const demo = useMemo(() => [...history.filter((r) => r.source === 'demo'), ...synthetic], [history, synthetic])
  const records = dataset === 'demo' ? demo : live

  return (
    <div className="flex flex-col gap-8">
      <Welcome />

      <section aria-labelledby="analytics-h" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="analytics-h" className="text-lg font-semibold tracking-tight">Prediction analytics</h2>
            <p className="text-sm text-muted-foreground">
              {dataset === 'demo'
                ? 'Synthetic demonstration dataset — not live model output and not hospital statistics.'
                : 'Computed only from live predictions saved in this browser.'}
            </p>
          </div>
          <DatasetToggle value={dataset} onChange={setChoice} />
        </div>

        {dataset === 'demo' && (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-semibold tracking-wide text-warning uppercase">
            Demo data — not a live model result
          </p>
        )}

        {!hydrated ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <KpiCards records={records} demo={dataset === 'demo'} />
        )}

        {hydrated && records.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No live predictions yet"
            description="Analytics appear once you run predictions against the backend. You can also preview the layout with clearly labelled synthetic data."
          >
            <Button render={<Link href="/predict" />} nativeButton={false}>
              <Stethoscope />
              Run first prediction
            </Button>
            <Button variant="outline" onClick={() => setChoice('demo')}>
              <FlaskConical />
              Show demonstration data
            </Button>
          </EmptyState>
        ) : hydrated ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <OutcomeChart records={records} />
            <ProbabilityChart records={records} />
            <ActivityChart records={records} />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="recent-h" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="recent-h" className="text-lg font-semibold tracking-tight">Recent predictions</h2>
            <p className="text-sm text-muted-foreground">
              {dataset === 'demo' ? 'Showing demonstration records.' : 'Latest live predictions from this browser.'}
            </p>
          </div>
          <Button variant="ghost" size="sm" render={<Link href="/history" />} nativeButton={false}>
            View all
            <ArrowRight />
          </Button>
        </div>
        {hydrated ? (
          <PredictionTable
            key={dataset}
            records={records}
            limit={8}
            allowDelete={false}
            emptyAction={
              <Button render={<Link href="/predict" />} nativeButton={false}>
                <Stethoscope />
                Run first prediction
              </Button>
            }
          />
        ) : (
          <Skeleton className="h-64 rounded-xl" />
        )}
      </section>
    </div>
  )
}
