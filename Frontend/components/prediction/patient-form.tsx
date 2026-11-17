'use client'

import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { useCategories } from '@/hooks/use-categories'
import {
  FEATURE_FIELDS,
  FEATURE_SECTIONS,
  icdOptionsFor,
  UNKNOWN_CATEGORY,
  type CategoricalField,
  type FeatureField,
  type FeatureSection,
} from '@/lib/schema'
import type { PatientFeatures } from '@/lib/types'
import { cn } from '@/lib/utils'

export function isFilled(v: unknown) {
  if (v === null) return true
  if (typeof v === 'number') return Number.isFinite(v)
  return typeof v === 'string' && v.trim().length > 0
}

export function useSectionProgress() {
  const values = useWatch<PatientFeatures>()
  return FEATURE_SECTIONS.map((section) => {
    const fields = FEATURE_FIELDS.filter((f) => f.section === section.id)
    const filled = fields.filter((f) => isFilled(values?.[f.key])).length
    return { section, filled, total: fields.length }
  })
}

function CategoricalInput({ field, invalid, describedBy }: { field: CategoricalField; invalid: boolean; describedBy: string }) {
  const { control, getValues, setValue } = useFormContext<PatientFeatures>()
  const categories = useCategories()
  const diagnosisCategory = useWatch({ control, name: 'primary_diag_category' })
  let options = categories.options[field.key]
  let filteredBy: string | null = null
  if (field.key === 'primary_icd10' && options) {
    const subset = icdOptionsFor(diagnosisCategory, options)
    if (subset) {
      options = subset
      filteredBy = String(diagnosisCategory).trim()
    }
  }
  const placeholder = categories.loading
    ? 'Loading options…'
    : options
      ? field.placeholder
      : 'Options unavailable — check model schema'

  function handleChange(next: string, onChange: (v: string) => void) {
    onChange(next)
    if (field.key !== 'primary_diag_category') return
    const allCodes = categories.options.primary_icd10
    const currentCode = getValues('primary_icd10')
    const subset = allCodes ? icdOptionsFor(next, allCodes) : null
    if (currentCode && currentCode !== UNKNOWN_CATEGORY && subset && !subset.includes(currentCode)) {
      setValue('primary_icd10', '', { shouldDirty: true })
    }
  }

  return (
    <>
      <Controller
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <NativeSelect
            id={`f-${field.key}`}
            name={field.key}
            value={typeof f.value === 'string' ? f.value : ''}
            options={options ? options.filter((o) => o !== UNKNOWN_CATEGORY) : []}
            onValueChange={(next) => handleChange(next, f.onChange)}
            onBlur={f.onBlur}
            placeholder={placeholder}
            disabled={!options}
            invalid={invalid}
            required
            describedBy={describedBy}
          />
        )}
      />
      {filteredBy ? (
        <p className="text-xs text-primary">{`Filtered to ${filteredBy} codes (${options?.length}).`}</p>
      ) : null}
    </>
  )
}

function FieldControl({ field }: { field: FeatureField }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PatientFeatures>()
  const categories = useCategories()
  const isNull = useWatch({ control, name: field.key }) === null
  const error = errors[field.key]?.message as string | undefined
  const id = `f-${field.key}`
  const descId = `${id}-desc`
  const errId = `${id}-err`
  const describedBy = error ? `${errId} ${descId}` : descId
  const categoryMissing = field.kind === 'categorical' && !categories.loading && !categories.options[field.key]

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-medium">
          {field.label}
          <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <code className="hidden font-mono text-[10px] text-muted-foreground sm:inline">{field.key}</code>
      </div>
      {field.kind === 'categorical' ? (
        <CategoricalInput field={field} invalid={!!error} describedBy={describedBy} />
      ) : (
        <div className="relative">
          <Input
            id={id}
            type="number"
            inputMode={field.step < 1 ? 'decimal' : 'numeric'}
            step={field.step}
            min={field.min}
            max={field.max}
            placeholder={isNull ? 'Unknown (null)' : field.placeholder ? `e.g. ${field.placeholder}` : undefined}
            autoComplete="off"
            aria-invalid={!!error}
            aria-required="true"
            aria-describedby={describedBy}
            className={cn('h-10 tabular', field.unit && 'pr-14', isNull && 'border-dashed border-primary/60 placeholder:text-primary')}
            {...register(field.key, { valueAsNumber: true })}
          />
          {field.unit && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-muted-foreground">
              {field.unit}
            </span>
          )}
        </div>
      )}
      {error ? (
        <p id={errId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
      {categoryMissing ? (
        <p className="text-xs font-medium text-warning">
          Options unavailable — check model schema. Add this feature&apos;s values to config/model-categories.json or expose them from the backend schema endpoint.
        </p>
      ) : null}
      <p id={descId} className="text-xs text-muted-foreground text-pretty">
        {field.description}
      </p>
    </div>
  )
}

export function FormSection({ section, filled, total }: { section: FeatureSection; filled: number; total: number }) {
  const complete = filled === total
  return (
    <fieldset
      id={`section-${section.id}`}
      className="scroll-mt-24 rounded-2xl border bg-card shadow-xs"
    >
      <legend className="sr-only">{`Section ${section.letter}: ${section.title}`}</legend>
      <div className="flex items-center gap-3 border-b border-dashed border-primary/25 px-5 py-4">
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-full border font-mono text-xs font-semibold transition-colors',
            complete ? 'border-primary/40 bg-primary/15 text-primary' : 'text-muted-foreground',
          )}
          aria-hidden="true"
        >
          {complete ? <Check className="size-3.5" /> : section.letter}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold tracking-tight">{section.title}</h2>
          <p className="text-xs text-muted-foreground">{section.description}</p>
        </div>
        <span className="font-mono text-xs text-muted-foreground tabular">{`${filled}/${total}`}</span>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {FEATURE_FIELDS.filter((f) => f.section === section.id).map((f) => (
          <FieldControl key={f.key} field={f} />
        ))}
      </div>
    </fieldset>
  )
}

export function ProgressRail() {
  const progress = useSectionProgress()
  const filled = progress.reduce((a, p) => a + p.filled, 0)
  const total = progress.reduce((a, p) => a + p.total, 0)
  const pct = Math.round((filled / total) * 100)

  return (
    <nav aria-label="Form progress" className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress</span>
        <span className="font-mono text-xs tabular">{`${filled}/${total} fields`}</span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Form completion"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-4 flex flex-col gap-0.5">
        {progress.map(({ section, filled: f, total: t }) => {
          const done = f === t
          return (
            <li key={section.id}>
              <a
                href={`#section-${section.id}`}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]',
                    done ? 'border-primary bg-primary text-primary-foreground' : f > 0 ? 'border-primary/50 text-primary' : 'text-muted-foreground',
                  )}
                  aria-hidden="true"
                >
                  {done ? <Check className="size-3" /> : section.letter}
                </span>
                <span className={cn('flex-1 truncate', done ? 'text-foreground' : 'text-muted-foreground')}>{section.title}</span>
                <span className="font-mono text-[11px] text-muted-foreground tabular">{`${f}/${t}`}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
