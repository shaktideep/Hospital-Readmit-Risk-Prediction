import type { Metadata } from 'next'
import Link from 'next/link'
import { BrainCircuit, Lock, ShieldAlert, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/shared/panel'
import { Pipeline } from '@/components/about/pipeline'

export const metadata: Metadata = { title: 'About CareSense' }

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-8 md:px-10">
        <div className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_60%)]" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <BrainCircuit className="size-3.5 text-primary" aria-hidden="true" />
            Served model
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance">XGBoost with FAISS RAG features</h2>
          <p className="mt-3 text-muted-foreground text-pretty">
            CareSense estimates the probability that a patient is readmitted within 30 days of discharge. Each request is
            enriched with retrieval-augmented features — signals from the most similar historical admissions — before a
            gradient-boosted tree model makes its prediction.
          </p>
        </div>
      </section>

      <section aria-labelledby="pipeline-h" className="flex flex-col gap-4">
        <div>
          <h2 id="pipeline-h" className="text-lg font-semibold tracking-tight">Inference pipeline</h2>
          <p className="text-sm text-muted-foreground">What happens between pressing “Predict” and seeing a result.</p>
        </div>
        <Pipeline />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="About the served model">
          <p className="text-sm text-muted-foreground text-pretty">
            The training notebook also explores a Transformer/XGBoost ensemble. The current FastAPI backend serves the
            XGBoost model with FAISS retrieval features only, so that is what CareSense describes and displays.
          </p>
        </Panel>
        <Panel title="Evaluation metrics">
          <p className="text-sm text-muted-foreground text-pretty">
            No measured evaluation results were supplied with this frontend, so CareSense does not show accuracy,
            precision, recall, F1 or AUC. Add them only from a verified evaluation report.
          </p>
        </Panel>
        <Panel title="Privacy & architecture">
          <p className="flex gap-2 text-sm text-muted-foreground text-pretty">
            <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Model artifacts stay on the backend. The browser only sends features and stores results locally — no names or
            contact details are collected.
          </p>
        </Panel>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-warning/40 bg-warning/5 p-6 sm:flex-row sm:items-center">
        <ShieldAlert className="size-6 shrink-0 text-warning" aria-hidden="true" />
        <p className="flex-1 text-sm text-pretty">
          <span className="font-semibold">Decision support only.</span> CareSense output is a statistical estimate and
          must not replace clinical judgement, diagnosis or institutional discharge protocols.
        </p>
        <Button render={<Link href="/predict" />} nativeButton={false}>
          <Stethoscope />
          Try a prediction
        </Button>
      </section>
    </div>
  )
}
