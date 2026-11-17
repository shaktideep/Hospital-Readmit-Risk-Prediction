'use client'

import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  ClipboardList,
  Eraser,
  Flower2,
  Leaf,
  Loader2,
  Plug,
  RefreshCw,
  Repeat,
  Siren,
  Sprout,
  Stethoscope,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { API_BASE_URL, ApiError, errorTitle, predict } from '@/lib/api'
import { buildDemoResult } from '@/lib/demo'
import { generateRef } from '@/lib/format'
import { deleteRecord, hasRecord, saveRecord, useHistory } from '@/lib/history'
import {
  CATEGORICAL_FIELDS,
  EMPTY_FORM_VALUES,
  FEATURE_FIELDS,
  getMissingFeatures,
  patientFeaturesSchema,
  SAMPLE_PATIENTS,
  toPayload,
  UNKNOWN_CATEGORY,
  type CategoricalOptions,
} from '@/lib/schema'
import type { PatientFeatures, PredictionRecord } from '@/lib/types'
import { useDemoMode } from '@/hooks/use-demo-mode'
import { useCategories } from '@/hooks/use-categories'
import { useHealth } from '@/hooks/use-health'
import { cn } from '@/lib/utils'
import { Mandala } from '@/components/layout/boho-motif'
import { CategoriesNotice } from './categories-notice'
import { ConnectionPanel } from './connection-panel'
import { FormSection, ProgressRail, useSectionProgress } from './patient-form'
import { InputsSummary } from './inputs-summary'
import { ClinicalNoteExtractor } from './note-extractor'
import { ResultView } from './result-view'

const MISSING = getMissingFeatures()

const SAMPLE_ICONS: Record<string, LucideIcon> = {
  'documented-example': Siren,
  'high-utiliser': Repeat,
  'stable-short-stay': Leaf,
}

function Sections() {
  const progress = useSectionProgress()
  return (
    <div className="flex flex-col gap-6">
      {progress.map((p) => (
        <FormSection key={p.section.id} {...p} />
      ))}
    </div>
  )
}

function ErrorPanel({ error, onRetry, onTest, pending }: { error: ApiError; onRetry: () => void; onTest: () => void; pending: boolean }) {
  const offline =
    error.kind === 'network' || error.kind === 'timeout' || error.kind === 'cors' || error.kind === 'config'
  const Icon = offline ? WifiOff : AlertTriangle
  return (
    <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 animate-in fade-in">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {errorTitle(error.kind)}
            {error.status ? <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{`HTTP ${error.status}`}</span> : null}
          </p>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">{error.message}</p>
          {error.details.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 font-mono text-xs text-foreground/80">
              {error.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Your entered values have been kept.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onRetry} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Retry
            </Button>
            {offline && (
              <Button size="sm" variant="outline" onClick={onTest}>
                <Plug />
                Test connection
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function PredictWorkflow() {
  const demo = useDemoMode()
  const history = useHistory()
  const categories = useCategories()
  const { refresh: refreshHealth } = useHealth()

  const gate = useRef<{ enforce: boolean; options: CategoricalOptions }>({ enforce: false, options: {} })
  useEffect(() => {
    gate.current = { enforce: !demo && !categories.loading, options: categories.options }
  })

  const baseResolver = zodResolver(patientFeaturesSchema as never) as unknown as Resolver<PatientFeatures>
  const resolver: Resolver<PatientFeatures> = async (values, context, options) => {
    const result = await baseResolver(values, context, options)
    const errors: Record<string, unknown> = { ...(result.errors as Record<string, unknown>) }
    let added = false
    if (gate.current.enforce) {
      for (const f of CATEGORICAL_FIELDS) {
        const value = values[f.key]
        const allowed = gate.current.options[f.key]
        if (
          typeof value === 'string' &&
          value.trim() &&
          value !== UNKNOWN_CATEGORY &&
          allowed &&
          !allowed.includes(value.trim()) &&
          !errors[f.key]
        ) {
          errors[f.key] = { type: 'validate', message: `"${value}" is not a category the model was trained on.` }
          added = true
        }
      }
    }
    return added ? ({ values: {}, errors } as unknown as Awaited<ReturnType<Resolver<PatientFeatures>>>) : result
  }

  const form = useForm<PatientFeatures>({
    resolver,
    defaultValues: EMPTY_FORM_VALUES,
    mode: 'onTouched',
  })
  const categoriesBlocked = !demo && (categories.loading || categories.missingKeys.length > 0)
  const [presetId, setPresetId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [record, setRecord] = useState<PredictionRecord | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const inFlight = useRef(false)

  async function run(values: PatientFeatures) {
    if (inFlight.current || MISSING.length > 0 || categoriesBlocked) return
    inFlight.current = true
    setPending(true)
    setError(null)
    setReviewOpen(false)
    const features = toPayload(values)
    try {
      const result = demo
        ? await new Promise<ReturnType<typeof buildDemoResult>>((r) => setTimeout(() => r(buildDemoResult(features, presetId)), 650))
        : await predict(features)
      const rec: PredictionRecord = {
        ref: generateRef(demo ? 'DEMO' : 'CS'),
        createdAt: new Date().toISOString(),
        source: demo ? 'demo' : 'live',
        features,
        result,
      }
      saveRecord(rec)
      setRecord(rec)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      toast.success(demo ? 'Demo result generated' : 'Prediction complete', { description: 'Saved to this browser’s history.' })
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('malformed', 'An unexpected error occurred while processing the response.')
      for (const f of FEATURE_FIELDS) {
        const message = err.fieldErrors[f.key]
        if (message) form.setError(f.key, { type: 'server', message })
      }
      setError(err)
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  const submit = form.handleSubmit(run, () => toast.error('Please correct the highlighted fields'))
  const openReview = form.handleSubmit(() => setReviewOpen(true), () => toast.error('Complete all fields to review'))

  function loadSample(id: string) {
    const s = SAMPLE_PATIENTS.find((p) => p.id === id)
    if (!s) return
    form.reset(s.features)
    setPresetId(id)
    setError(null)
    toast.info(`Loaded synthetic patient: ${s.name}`)
    if (!demo && !categories.loading) {
      const unknown = CATEGORICAL_FIELDS.filter((f) => {
        const allowed = categories.options[f.key]
        return allowed && !allowed.includes(String(s.features[f.key]))
      })
      if (unknown.length > 0) {
        toast.warning('Some sample values are not model categories', {
          description: `${unknown.map((f) => f.label).join(', ')} — choose a valid option before predicting.`,
        })
      }
    }
  }

  function resetForm() {
    form.reset(EMPTY_FORM_VALUES)
    setPresetId(null)
    setError(null)
  }

  if (record) {
    const saved = hasRecord(history, record.ref)
    return (
      <ResultView
        record={record}
        saved={saved}
        onToggleSave={() => {
          if (saved) {
            deleteRecord(record.ref)
            toast('Removed from history')
          } else {
            saveRecord(record)
            toast.success('Saved to history')
          }
        }}
        onNewPrediction={() => {
          setRecord(null)
          window.scrollTo({ top: 0 })
        }}
      />
    )
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate aria-busy={pending} className="flex flex-col gap-6">
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-dashed border-primary/35 bg-card/70 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <Mandala className="pointer-events-none absolute -right-16 -top-20 size-64 opacity-[0.1]" />
          <div className="relative max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Flower2 className="size-4" aria-hidden="true" />
              Patient intake
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance">Estimate 30-day readmission risk</h2>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              {demo
                ? 'Demo Mode is on — results are synthetic and no request is sent to the model.'
                : 'Enter non-identifying features. They are sent to the CareSense FastAPI /predict endpoint.'}
            </p>
          </div>
          <div className="relative flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={resetForm} disabled={pending}>
              <Eraser />
              Reset
            </Button>
            <Button type="button" variant="outline" onClick={openReview} disabled={pending}>
              <ClipboardList />
              Review
            </Button>
            <Button type="submit" disabled={pending || MISSING.length > 0 || categoriesBlocked} className="min-w-36">
              {pending ? <Loader2 className="animate-spin" /> : <Stethoscope />}
              {pending ? 'Predicting…' : 'Run Prediction'}
            </Button>
          </div>
        </div>

        <ConnectionPanel />
        <CategoriesNotice demo={demo} />

        {pending && !demo && (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {`Contacting ${API_BASE_URL}/predict…`}
          </p>
        )}

        {MISSING.length > 0 && (
          <div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            <p className="font-semibold">Form configuration is incomplete</p>
            <p className="mt-1 text-muted-foreground">
              {'The backend expects features with no form field. Add them to FEATURE_FIELDS in lib/schema.ts: '}
              <code className="font-mono">{MISSING.join(', ')}</code>
            </p>
          </div>
        )}

        <ClinicalNoteExtractor
          disabled={pending}
          onApplied={() => {
            setPresetId(null)
            setError(null)
          }}
        />

        <section aria-labelledby="samples-h" className="rounded-2xl border border-dashed border-primary/30 bg-card/60 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 id="samples-h" className="flex items-center gap-2 text-sm font-semibold">
              <Sprout className="size-4 text-primary" aria-hidden="true" />
              Try a sample patient
            </h3>
            <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning">
              Demo data
            </span>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              {SAMPLE_PATIENTS.map((s) => {
                const Icon = SAMPLE_ICONS[s.id] ?? Sprout
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => loadSample(s.id)}
                    disabled={pending}
                    aria-pressed={presetId === s.id}
                    title={s.summary}
                    className={cn(
                      'inline-flex h-9 items-center gap-2 rounded-full border bg-card px-3.5 text-sm font-medium outline-none transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                      presetId === s.id && 'border-primary bg-accent',
                    )}
                  >
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    {s.name}
                    <span className="sr-only">{`. ${s.summary}`}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {error && (
          <ErrorPanel
            error={error}
            pending={pending}
            onRetry={() => submit()}
            onTest={async () => {
              const result = await refreshHealth()
              if (result?.state === 'ready') toast.success('API is reachable again. You can retry.')
              else toast.error('Health check failed', { description: result?.error ?? undefined })
            }}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <fieldset disabled={pending} className="min-w-0 disabled:opacity-70">
            <legend className="sr-only">Patient features</legend>
            <Sections />
          </fieldset>
          <aside className="order-first lg:order-none">
            <div className="lg:sticky lg:top-24">
              <ProgressRail />
            </div>
          </aside>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t pt-6">
          <Button type="button" variant="outline" onClick={openReview} disabled={pending}>
            <ClipboardList />
            Review entered information
          </Button>
          <Button type="submit" disabled={pending || MISSING.length > 0 || categoriesBlocked} className="min-w-36">
            {pending ? <Loader2 className="animate-spin" /> : <Stethoscope />}
            {pending ? 'Predicting…' : 'Run Prediction'}
          </Button>
        </div>
      </form>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review entered information</DialogTitle>
            <DialogDescription>
              {demo ? 'Demo Mode — a synthetic result will be produced.' : 'These values will be sent to POST /predict.'}
            </DialogDescription>
          </DialogHeader>
          <InputsSummary features={form.getValues()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Edit
            </Button>
            <Button onClick={() => submit()} disabled={pending || categoriesBlocked}>
              {pending ? <Loader2 className="animate-spin" /> : <Stethoscope />}
              Run Prediction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormProvider>
  )
}
