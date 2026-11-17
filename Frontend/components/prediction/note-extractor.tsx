'use client'

import { useId, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Eraser, ScrollText, WandSparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCategories } from '@/hooks/use-categories'
import { parseClinicalNote } from '@/lib/clinical-note'
import { FEATURE_FIELDS, FIELD_BY_KEY, UNKNOWN_CATEGORY } from '@/lib/schema'
import type { PatientFeatures } from '@/lib/types'

const EXAMPLE_NOTE =
  'Patient: 67 yr old F, Odisha. Admit: Emergency, Ward: General. Primary DX: Endocrine (E11). Vitals/Labs: HbA1c 7.4, BP 148, Creatinine 1.1. Severity: 3 Charlson, 2 procedures, 5 days stay. History: 2 prior admissions, 4 comorbidities.'

const hasValue = (v: unknown) => (typeof v === 'number' ? Number.isFinite(v) : typeof v === 'string' && v.trim() !== '' && v !== UNKNOWN_CATEGORY)

type Outcome =
  | { status: 'empty' }
  | { status: 'unrecognised' }
  | { status: 'filled'; extracted: number; missing: string[]; review: string[] }

export function ClinicalNoteExtractor({ disabled, onApplied }: { disabled?: boolean; onApplied?: () => void }) {
  const { setValue, getValues } = useFormContext<PatientFeatures>()
  const categories = useCategories()
  const [note, setNote] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const id = useId()

  function fillUp() {
    if (!note.trim()) {
      setOutcome({ status: 'empty' })
      return
    }
    const parsed = parseClinicalNote(note, categories.options)
    if (parsed.extracted.length === 0 && parsed.review.length === 0) {
      setOutcome({ status: 'unrecognised' })
      return
    }
    for (const key of parsed.extracted) {
      setValue(key, parsed.values[key] as never, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    }
    const current = getValues()
    onApplied?.()
    setOutcome({
      status: 'filled',
      extracted: parsed.extracted.length,
      missing: parsed.missing.map((k) =>
        hasValue(current[k]) ? `${FIELD_BY_KEY[k].label} (kept existing value)` : FIELD_BY_KEY[k].label,
      ),
      review: parsed.review.map((r) => `${FIELD_BY_KEY[r.key].label} (“${r.raw}”: ${r.reason})`),
    })
  }

  function clear() {
    setNote('')
    setOutcome(null)
  }

  return (
    <section aria-labelledby={`${id}-h`} className="w-full min-w-0 rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
          <ScrollText className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h3 id={`${id}-h`} className="text-base font-semibold tracking-tight">
            Clinical note
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
            Paste a note and the fields below are filled in for you. Fields the note does not state are left as they are, so you can complete them by hand.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Label htmlFor={`${id}-note`} className="sr-only">
          Clinical note
        </Label>
        <Textarea
          id={`${id}-note`}
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            if (outcome) setOutcome(null)
          }}
          rows={5}
          disabled={disabled}
          placeholder={EXAMPLE_NOTE}
          spellCheck={false}
          className="field-sizing-fixed min-h-28 w-full bg-background/60 leading-relaxed"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={fillUp} disabled={disabled} className="h-9 px-4">
            <WandSparkles />
            Fill up
          </Button>
          <Button type="button" variant="ghost" onClick={clear} disabled={disabled || (!note && !outcome)} className="h-9">
            <Eraser />
            Clear note
          </Button>
        </div>

        <div role="status" aria-live="polite" className="text-sm empty:hidden">
          {outcome?.status === 'empty' && <p className="font-medium text-warning">Paste a clinical note first.</p>}
          {outcome?.status === 'unrecognised' && (
            <p className="font-medium text-warning text-pretty">
              No fields were recognised, so the form was left unchanged. Use the format shown in the placeholder:
              {' “Patient: … yr old …, …. Admit: …, Ward: …. Primary DX: … (…).”'}
            </p>
          )}
          {outcome?.status === 'filled' && (
            <div className="w-full rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-pretty">
              <p className="font-medium text-success">
                {`Filled ${outcome.extracted} · Missing ${outcome.missing.length} · Manual review ${outcome.review.length} (of ${FEATURE_FIELDS.length} fields).`}
              </p>
              {outcome.missing.length > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">{`Not stated in the note: ${outcome.missing.join(', ')}.`}</p>
              )}
              {outcome.review.length > 0 && (
                <p className="mt-0.5 text-xs font-medium text-warning">{`Needs manual review: ${outcome.review.join('; ')}.`}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
