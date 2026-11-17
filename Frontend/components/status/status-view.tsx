'use client'

import { CheckCircle2, CircleDashed, Clock, Cpu, FlaskConical, Globe, RefreshCw, Server, TriangleAlert, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Panel } from '@/components/shared/panel'
import { StatusDot } from '@/components/layout/status-dot'
import { HEALTH_COPY, useHealth } from '@/hooks/use-health'
import { API_BASE_URL } from '@/lib/api'
import { formatDateTime, formatProbability } from '@/lib/format'
import type { HealthSnapshot } from '@/lib/types'
import { cn } from '@/lib/utils'

type CheckState = 'pass' | 'fail' | 'unknown' | 'checking'

function probeState(v: unknown): CheckState {
  if (v === true) return 'pass'
  if (typeof v === 'string') return ['ok', 'pass', 'passed', 'true', 'success'].includes(v.toLowerCase()) ? 'pass' : 'fail'
  if (v === false) return 'fail'
  return 'unknown'
}

function deriveChecks(s: HealthSnapshot | undefined) {
  if (!s) return { reach: 'checking', model: 'checking', probe: 'checking' } as const
  const reach: CheckState = s.reachable ? 'pass' : 'fail'
  if (!s.reachable) return { reach, model: 'unknown' as CheckState, probe: 'unknown' as CheckState }
  const model: CheckState = s.data?.model_loaded === true ? 'pass' : s.data?.model_loaded === false ? 'fail' : 'unknown'
  const probe = model === 'fail' ? 'unknown' : probeState(s.data?.prediction_check)
  return { reach, model, probe }
}

const CHECK_STYLE: Record<CheckState, { icon: typeof CheckCircle2; className: string; text: string }> = {
  pass: { icon: CheckCircle2, className: 'text-success', text: 'Passed' },
  fail: { icon: XCircle, className: 'text-destructive', text: 'Failed' },
  unknown: { icon: CircleDashed, className: 'text-muted-foreground', text: 'Not reported' },
  checking: { icon: RefreshCw, className: 'text-muted-foreground animate-spin', text: 'Checking…' },
}

function CheckStep({ n, title, description, icon: Icon, state }: { n: number; title: string; description: string; icon: typeof Globe; state: CheckState }) {
  const s = CHECK_STYLE[state]
  return (
    <li
      className={cn(
        'relative flex flex-1 flex-col gap-3 rounded-xl border bg-card p-5',
        state === 'pass' && 'border-success/40',
        state === 'fail' && 'border-destructive/40',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="font-mono text-xs text-muted-foreground">{`0${n}`}</span>
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground text-pretty">{description}</p>
      </div>
      <p className={cn('mt-auto flex items-center gap-1.5 text-sm font-medium', s.className.replace('animate-spin', ''))}>
        <s.icon className={cn('size-4', s.className)} aria-hidden="true" />
        {s.text}
      </p>
    </li>
  )
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm font-medium break-all sm:text-right', mono && 'font-mono text-xs')}>{value}</dd>
    </div>
  )
}

export function StatusView() {
  const { snapshot, state, isChecking, refresh } = useHealth()
  const checks = deriveChecks(snapshot)
  const data = snapshot?.data
  const copy = HEALTH_COPY[state]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Model & API status</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live result of <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">GET /health</code>. Auto-refreshes every 30 seconds.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={isChecking}>
          <RefreshCw className={cn(isChecking && 'animate-spin')} />
          {isChecking ? 'Checking…' : 'Refresh'}
        </Button>
      </div>

      <section
        aria-live="polite"
        className={cn(
          'flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center',
          state === 'ready' && 'border-success/40 bg-success/5',
          (state === 'degraded' || state === 'not_ready') && 'border-warning/40 bg-warning/5',
          state === 'unreachable' && 'border-destructive/40 bg-destructive/5',
          state === 'checking' && 'bg-card',
        )}
      >
        <StatusDot state={state} className="size-3 [&>span]:size-3" />
        <div className="flex-1">
          <p className="text-lg font-semibold">{copy.label}</p>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>
        {state !== 'ready' && state !== 'checking' && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FlaskConical className="size-3.5" aria-hidden="true" />
            Demo Mode is available from the top bar.
          </p>
        )}
      </section>

      <ol className="flex flex-col gap-4 md:flex-row" aria-label="Health checks">
        <CheckStep n={1} icon={Globe} title="Backend reachable" description="The browser received an HTTP response from the FastAPI server." state={checks.reach} />
        <CheckStep n={2} icon={Server} title="Model loaded" description="Model artifacts, preprocessor and FAISS index reported as loaded." state={checks.model} />
        <CheckStep n={3} icon={Cpu} title="Inference probe passed" description="The backend ran a test prediction end-to-end at health-check time." state={checks.probe} />
      </ol>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Health details" description="Values exactly as reported by the backend.">
          {!snapshot ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <dl>
              <Field label="API base URL" value={API_BASE_URL || 'Not configured'} mono />
              <Field label="HTTP status" value={snapshot.httpStatus ?? '—'} mono />
              <Field label="Reported status" value={data?.status ?? '—'} mono />
              <Field label="Test prediction" value={data?.test_prediction != null ? String(data.test_prediction) : 'Not supplied'} mono />
              <Field
                label="Test probability"
                value={typeof data?.test_probability === 'number' ? formatProbability(data.test_probability) : 'Not supplied'}
                mono
              />
              <Field label="Last checked" value={formatDateTime(snapshot.checkedAt)} />
              <Field
                label="Last successful check"
                value={
                  snapshot.lastSuccessfulAt ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      {formatDateTime(snapshot.lastSuccessfulAt)}
                    </span>
                  ) : (
                    'None this session'
                  )
                }
              />
            </dl>
          )}
        </Panel>

        <Panel title="Diagnostics" description="Error details and the raw health payload.">
          {snapshot?.error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <p className="break-words">{snapshot.error}</p>
            </div>
          )}
          {!snapshot ? (
            <Skeleton className="h-40 w-full" />
          ) : data ? (
            <pre className="max-h-72 overflow-auto rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              No JSON payload received. Confirm the FastAPI server is running at the base URL above and that its CORS settings allow this origin.
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground text-pretty">
            CareSense does not display accuracy, AUC, uptime or latency history — only what the backend reports live.
          </p>
        </Panel>
      </div>
    </div>
  )
}
