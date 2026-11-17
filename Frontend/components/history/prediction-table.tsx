'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Search, SearchX, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { OutcomeBadge, SourceBadge } from '@/components/shared/badges'
import { EmptyState } from '@/components/shared/empty-state'
import { deleteRecord } from '@/lib/history'
import { formatDateTime, formatProbability, isReadmitted } from '@/lib/format'
import type { PredictionRecord } from '@/lib/types'
import { cn } from '@/lib/utils'
import { PredictionDetailDialog } from './prediction-detail-dialog'

type SortKey = 'date' | 'probability' | 'age'
type Outcome = 'all' | 'readmitted' | 'not_readmitted'

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'readmitted', label: 'Readmission' },
  { value: 'not_readmitted', label: 'No readmission' },
]

function SortHeader({
  label,
  k,
  sort,
  dir,
  onSort,
  className,
}: {
  label: string
  k: SortKey
  sort: SortKey
  dir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
  className?: string
}) {
  const active = sort === k
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead className={className} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          'inline-flex items-center gap-1 rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
          active && 'text-foreground',
        )}
      >
        {label}
        <Icon className="size-3" aria-hidden="true" />
      </button>
    </TableHead>
  )
}

export function PredictionTable({
  records,
  limit,
  allowDelete = true,
  emptyAction,
}: {
  records: PredictionRecord[]
  limit?: number
  allowDelete?: boolean
  emptyAction?: React.ReactNode
}) {
  const [query, setQuery] = useState('')
  const [outcome, setOutcome] = useState<Outcome>('all')
  const [sort, setSort] = useState<SortKey>('date')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<string | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = records.filter((r) => {
      const pos = isReadmitted(r.result.prediction_label)
      if (outcome === 'readmitted' && !pos) return false
      if (outcome === 'not_readmitted' && pos) return false
      if (!q) return true
      return [r.ref, r.features.primary_diag_category, r.features.primary_icd10, String(r.features.age), r.result.model]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
    const m = dir === 'asc' ? 1 : -1
    filtered.sort((a, b) => {
      if (sort === 'probability') return (a.result.probability_readmitted_30d - b.result.probability_readmitted_30d) * m
      if (sort === 'age') return ((a.features.age ?? 0) - (b.features.age ?? 0)) * m
      return (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * m
    })
    return limit ? filtered.slice(0, limit) : filtered
  }, [records, query, outcome, sort, dir, limit])

  const selectedRecord = records.find((r) => r.ref === selected) ?? null

  function onSort(k: SortKey) {
    if (k === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSort(k)
      setDir('desc')
    }
  }

  function remove(ref: string) {
    deleteRecord(ref)
    toast('Record deleted', { description: ref })
  }

  if (records.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No predictions recorded yet"
        description="Run a prediction and it will be saved to this browser so you can revisit it here."
      >
        {emptyAction}
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference, diagnosis, ICD-10, age…"
            aria-label="Search predictions"
            className="h-9 pl-9"
          />
        </div>
        <div role="group" aria-label="Filter by outcome" className="flex rounded-lg border bg-muted/40 p-0.5">
          {OUTCOMES.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOutcome(o.value)}
              aria-pressed={outcome === o.value}
              className={cn(
                'h-8 flex-1 rounded-md px-3 text-xs font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:flex-none',
                outcome === o.value && 'bg-background text-foreground shadow-xs',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 md:hidden" role="group" aria-label="Sort">
          <Button variant={sort === 'date' ? 'secondary' : 'ghost'} size="sm" onClick={() => onSort('date')}>
            Date {sort === 'date' && (dir === 'asc' ? <ArrowUp /> : <ArrowDown />)}
          </Button>
          <Button variant={sort === 'probability' ? 'secondary' : 'ghost'} size="sm" onClick={() => onSort('probability')}>
            Probability {sort === 'probability' && (dir === 'asc' ? <ArrowUp /> : <ArrowDown />)}
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={SearchX} title="No matching predictions" description="Try a different search term or outcome filter.">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery('')
              setOutcome('all')
            }}
          >
            Clear filters
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <SortHeader label="Age" k="age" sort={sort} dir={dir} onSort={onSort} />
                  <TableHead>Diagnosis</TableHead>
                  <SortHeader label="Probability" k="probability" sort={sort} dir={dir} onSort={onSort} />
                  <TableHead>Prediction</TableHead>
                  <SortHeader label="Timestamp" k="date" sort={sort} dir={dir} onSort={onSort} />
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.ref} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium">{r.ref}</span>
                        {r.source === 'demo' && <SourceBadge source="demo" />}
                      </div>
                    </TableCell>
                    <TableCell className="tabular">{r.features.age}</TableCell>
                    <TableCell className="max-w-40 truncate">{r.features.primary_diag_category || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                          <div
                            className={cn('h-full rounded-full', isReadmitted(r.result.prediction_label) ? 'bg-chart-5' : 'bg-primary')}
                            style={{ width: `${r.result.probability_readmitted_30d * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-medium tabular">{formatProbability(r.result.probability_readmitted_30d)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <OutcomeBadge label={r.result.prediction_label} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(r.ref)}>
                          <Eye />
                          View
                          <span className="sr-only">{` ${r.ref}`}</span>
                        </Button>
                        {allowDelete && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => remove(r.ref)}
                            aria-label={`Delete ${r.ref}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map((r) => (
              <li key={r.ref} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium">{r.ref}</span>
                      {r.source === 'demo' && <SourceBadge source="demo" />}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {`Age ${r.features.age} · ${r.features.primary_diag_category || '—'} · ${formatDateTime(r.createdAt)}`}
                    </p>
                  </div>
                  <span className="font-mono text-lg font-semibold tabular">{formatProbability(r.result.probability_readmitted_30d)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <OutcomeBadge label={r.result.prediction_label} />
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setSelected(r.ref)}>
                      <Eye />
                      View
                    </Button>
                    {allowDelete && (
                      <Button variant="ghost" size="icon-sm" onClick={() => remove(r.ref)} aria-label={`Delete ${r.ref}`}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <PredictionDetailDialog record={selectedRecord} onClose={() => setSelected(null)} />
    </div>
  )
}
