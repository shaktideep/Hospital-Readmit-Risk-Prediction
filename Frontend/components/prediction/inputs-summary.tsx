import { FEATURE_FIELDS, FEATURE_SECTIONS } from '@/lib/schema'
import type { PatientFeatures } from '@/lib/types'
import { cn } from '@/lib/utils'

export function formatFeatureValue(key: keyof PatientFeatures, value: unknown) {
  const field = FEATURE_FIELDS.find((f) => f.key === key)
  if (value === undefined || value === null || value === '' || (typeof value === 'number' && Number.isNaN(value))) return '—'
  if (field?.kind === 'number' && typeof value === 'number') {
    if (field.unit === 'INR') return `₹${value.toLocaleString('en-IN')}`
    return field.unit && field.unit !== '%' ? `${value} ${field.unit}` : `${value}${field.unit ?? ''}`
  }
  return String(value)
}

export function InputsSummary({ features, className }: { features: Partial<PatientFeatures>; className?: string }) {
  return (
    <div className={cn('grid gap-5 sm:grid-cols-2', className)}>
      {FEATURE_SECTIONS.map((section) => (
        <div key={section.id} className="min-w-0">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex size-5 items-center justify-center rounded border font-mono text-[10px]">{section.letter}</span>
            {section.title}
          </h3>
          <dl className="divide-y rounded-lg border">
            {FEATURE_FIELDS.filter((f) => f.section === section.id).map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <dt className="truncate text-muted-foreground">{f.label}</dt>
                <dd className="shrink-0 font-medium tabular">{formatFeatureValue(f.key, features[f.key])}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}
