import { Network } from 'lucide-react'
import { Panel } from '@/components/shared/panel'
import { formatNumber } from '@/lib/format'

function Metric({ name, field, value, hint }: { name: string; field: string; value: number; hint: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <dt className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{name}</span>
        <code className="font-mono text-[11px] text-muted-foreground">{field}</code>
      </dt>
      <dd className="mt-2 font-mono text-2xl font-semibold tracking-tight tabular">{formatNumber(value)}</dd>
      <p className="mt-1 text-xs text-muted-foreground text-pretty">{hint}</p>
    </div>
  )
}

export function RagPanel({ ragScore, ragMinDist }: { ragScore: number; ragMinDist: number }) {
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Network className="size-4 text-primary" aria-hidden="true" />
          Retrieval (RAG) features
        </span>
      }
      description="Technical values computed by the FAISS retrieval step and used as model inputs."
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        <Metric name="RAG score" field="rag_score" value={ragScore} hint="Retrieval-derived feature passed to XGBoost." />
        <Metric name="Nearest distance" field="rag_min_dist" value={ragMinDist} hint="Embedding distance to the closest indexed note." />
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground text-pretty">
        These are intermediate pipeline values. They are not calibrated probabilities, causal explanations, or proof of
        clinical similarity. Retrieved records are never exposed by the API.
      </p>
    </Panel>
  )
}
