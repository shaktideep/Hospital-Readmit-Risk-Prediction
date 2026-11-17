'use client'

import Link from 'next/link'
import { ArrowLeft, BookmarkCheck, BookmarkPlus, CircleCheck, ClipboardCopy, Download, Info, Printer, RotateCcw, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Mandala } from '@/components/layout/boho-motif'
import { Panel } from '@/components/shared/panel'
import { OutcomeBadge, SourceBadge } from '@/components/shared/badges'
import { buildSummary, DECISION_THRESHOLD, downloadText, formatDateTime, formatProbability, isReadmitted, labelText } from '@/lib/format'
import type { PredictionRecord } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ProbabilityRing } from './probability-ring'
import { ClinicalNotePanel } from './clinical-note'
import { InputsSummary } from './inputs-summary'

export function RiskBadge({ probability, simulated }: { probability: number; simulated: boolean }) {
  const high = probability >= DECISION_THRESHOLD
  const Icon = high ? TriangleAlert : CircleCheck
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5 sm:items-end">
      <span
        data-risk={high ? 'high' : 'low'}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-base font-semibold whitespace-nowrap sm:text-lg',
          high ? 'border-chart-5/40 bg-chart-5/10 text-chart-5' : 'border-success/40 bg-success/10 text-success',
        )}
      >
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        {high ? 'High Risk' : 'Low Risk'}
      </span>
      <p className="max-w-56 text-xs text-muted-foreground text-pretty sm:text-right">
        {simulated ? 'Simulated Demo Mode classification. ' : ''}
        {`Model classification at the ${DECISION_THRESHOLD} threshold, not a clinically validated diagnosis.`}
      </p>
    </div>
  )
}

export function ResultHero({ record, compact = false }: { record: PredictionRecord; compact?: boolean }) {
  const { result } = record
  const positive = isReadmitted(result.prediction_label)
  const pct = result.probability_readmitted_30d

  return (
    <section
      aria-labelledby={`result-${record.ref}`}
      className="relative overflow-hidden rounded-3xl border bg-card shadow-xs"
    >
      <Mandala
        className={cn('absolute -right-20 -top-20 size-80 opacity-[0.1]', positive && 'text-chart-5')}
      />
      <div className={cn('relative flex flex-col items-center gap-6 p-6 md:flex-row md:items-center md:gap-10', compact ? 'md:p-6' : 'md:p-8')}>
        <ProbabilityRing probability={pct} positive={positive} size={compact ? 180 : 220} className="shrink-0" />
        <div className="w-full min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={record.source} />
            <OutcomeBadge label={result.prediction_label} />
          </div>
          <p id={`result-${record.ref}`} className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            30-Day Readmission Probability
          </p>
          <div className="mt-1 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <p className="text-4xl font-semibold tracking-tight tabular sm:text-5xl">{formatProbability(pct)}</p>
            <RiskBadge probability={pct} simulated={record.source === 'demo'} />
          </div>
          <p className={cn('mt-2 text-base font-medium text-pretty', positive ? 'text-chart-5' : 'text-success')}>
            {labelText(result.prediction_label)}
          </p>

          <div className="mt-4" aria-hidden="true">
            <div className="relative h-1.5 rounded-full bg-muted">
              <div
                className={cn('absolute inset-y-0 left-0 rounded-full', positive ? 'bg-chart-5' : 'bg-primary')}
                style={{ width: `${pct * 100}%` }}
              />
              <div className="absolute -top-1 h-3.5 w-0.5 rounded bg-foreground" style={{ left: `${DECISION_THRESHOLD * 100}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>0%</span>
              <span>{`Model decision threshold · ${DECISION_THRESHOLD}`}</span>
              <span>100%</span>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <dt className="text-xs text-muted-foreground">Model</dt>
              <dd className="truncate font-medium" title={result.model}>{result.model}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Reference</dt>
              <dd className="font-mono font-medium">{record.ref}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Generated</dt>
              <dd className="font-medium tabular">{formatDateTime(record.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="relative flex items-start gap-2 border-t bg-muted/30 px-6 py-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <p className="text-pretty">
          {`This is a model estimate intended to support — not replace — professional clinical judgment. The ${DECISION_THRESHOLD} threshold is the model's binary decision boundary, not a clinically validated intervention threshold.`}
        </p>
      </div>
    </section>
  )
}

export function ResultDetails({ record }: { record: PredictionRecord }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <ClinicalNotePanel note={record.result.clinical_note} source={record.source} className="w-full" />
      <Panel title="Patient inputs submitted" description="Non-identifying features sent to the model.">
        <InputsSummary features={record.features} className="lg:grid-cols-3" />
      </Panel>
    </div>
  )
}

export function useResultActions(record: PredictionRecord) {
  const summary = () => buildSummary(record)
  return {
    async copySummary() {
      try {
        await navigator.clipboard.writeText(summary())
        toast.success('Result summary copied')
      } catch {
        toast.error('Clipboard is unavailable in this browser context')
      }
    },
    download() {
      downloadText(`caresense-${record.ref}.txt`, summary())
      toast.success('Report downloaded')
    },
  }
}

export function ResultView({
  record,
  saved,
  onToggleSave,
  onNewPrediction,
}: {
  record: PredictionRecord
  saved: boolean
  onToggleSave: () => void
  onNewPrediction: () => void
}) {
  const actions = useResultActions(record)
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button onClick={onNewPrediction}>
          <RotateCcw />
          Run another prediction
        </Button>
        <Button variant="outline" onClick={onToggleSave} aria-pressed={saved}>
          {saved ? <BookmarkCheck className="text-primary" /> : <BookmarkPlus />}
          {saved ? 'Saved to history' : 'Save to history'}
        </Button>
        <Button variant="outline" onClick={actions.copySummary}>
          <ClipboardCopy />
          Copy summary
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          Print report
        </Button>
        <Button variant="outline" onClick={actions.download}>
          <Download />
          Download
        </Button>
        <Button variant="ghost" className="sm:ml-auto" render={<Link href="/" />} nativeButton={false}>
          <ArrowLeft />
          Return to overview
        </Button>
      </div>
      <ResultHero record={record} />
      <ResultDetails record={record} />
    </div>
  )
}
