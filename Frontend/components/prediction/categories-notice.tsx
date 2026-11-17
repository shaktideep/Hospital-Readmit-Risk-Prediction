'use client'

import { Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCategories } from '@/hooks/use-categories'
import { FEATURE_FIELDS } from '@/lib/schema'
import { API_BASE_URL } from '@/lib/api'

const labelFor = (key: string) => FEATURE_FIELDS.find((f) => f.key === key)?.label ?? key

export function CategoriesNotice({ demo }: { demo: boolean }) {
  const { loading, missingKeys, backendError, schemaPath, isValidating, refresh } = useCategories()
  if (loading || missingKeys.length === 0) return null

  return (
    <div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm animate-in fade-in">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {demo ? 'Category lists are not loaded' : 'Prediction is paused: the valid category values are unknown'}
          </p>
          <p className="mt-1 text-muted-foreground text-pretty">
            {demo
              ? 'Dropdowns stay disabled until the lists are available. Load a sample patient to try Demo Mode.'
              : 'Categorical fields only accept values the model was trained on, and none can be guessed. Provide them using either option below.'}
          </p>
          {backendError && <p className="mt-2 font-mono text-xs text-foreground/80">{backendError}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {'Missing for: '}
            <span className="font-medium text-foreground">{missingKeys.map(labelFor).join(', ')}</span>
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li>
              {'Expose '}
              <code className="font-mono text-foreground">{`GET ${API_BASE_URL || '<NEXT_PUBLIC_API_BASE_URL>'}${schemaPath}`}</code>
              {' returning '}
              <code className="font-mono text-foreground">{'{ "categorical_features": { "gender": ["…"], … } }'}</code>
              {'.'}
            </li>
            <li>
              {'Or paste the lists into '}
              <code className="font-mono text-foreground">config/model-categories.json</code>
              {' (see the README).'}
            </li>
          </ol>
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => refresh()} disabled={isValidating}>
              {isValidating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Check again
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
