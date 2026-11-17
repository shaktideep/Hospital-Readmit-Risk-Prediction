import { Binary, Calculator, ClipboardList, FileText, GitBranch, Search, SlidersHorizontal, Send } from 'lucide-react'

const STAGES = [
  { icon: ClipboardList, title: 'Patient feature input', body: 'Demographics, admission details, vitals, history and billing are validated in the browser and sent to POST /predict.' },
  { icon: FileText, title: 'Clinical note generation', body: 'The backend composes a structured natural-language note from the submitted features.' },
  { icon: Binary, title: 'MiniLM text embedding', body: 'The note is encoded into a dense sentence vector with a MiniLM sentence-transformer.' },
  { icon: Search, title: 'FAISS nearest-neighbor retrieval', body: 'The vector queries a FAISS index of historical admissions to find the most similar cases.' },
  { icon: Calculator, title: 'Retrieval-derived features', body: 'Neighbour readmission rate, similarity scores and count become additional model features.' },
  { icon: SlidersHorizontal, title: 'Saved tabular preprocessing', body: 'The fitted preprocessing pipeline encodes categories and scales numerics exactly as in training.' },
  { icon: GitBranch, title: 'XGBoost prediction', body: 'A gradient-boosted tree model scores the combined tabular and retrieval features.' },
  { icon: Send, title: 'Probability & summary returned', body: 'FastAPI returns probability_readmitted_30d, the label, the clinical note and RAG values.' },
]

export function Pipeline() {
  return (
    <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Model pipeline stages">
      {STAGES.map((s, i) => (
        <li key={s.title} className="group relative flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs transition-colors hover:border-primary/50">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <s.icon className="size-5" aria-hidden="true" />
            </span>
            <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
            {i < STAGES.length - 1 && (
              <span className="ml-auto hidden h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent lg:block" aria-hidden="true" />
            )}
          </div>
          <h3 className="font-medium">{s.title}</h3>
          <p className="text-sm text-muted-foreground text-pretty">{s.body}</p>
        </li>
      ))}
    </ol>
  )
}
