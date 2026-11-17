import { SAMPLE_PATIENTS } from './schema'
import { generateRef } from './format'
import type { PatientFeatures, PredictResponse, PredictionRecord } from './types'

export const DEMO_MODEL_NAME = 'DEMO — synthetic result (no model called)'

const DEMO_PROBABILITIES: Record<string, number> = {
  'documented-example': 0.4182,
  'high-utiliser': 0.8124,
  'stable-short-stay': 0.1367,
}

function demoNote(f: PatientFeatures) {
  return (
    `[SYNTHETIC DEMO NOTE] ${f.age}-year-old ${f.gender.toLowerCase()} from ${f.state_patient}, ` +
    `${f.admit_type.toLowerCase()} admission to ${f.ward_type.toLowerCase()} ward for ${f.primary_diag_category.toLowerCase()} ` +
    `(${f.primary_icd10}). HbA1c ${f.hba1c}%, systolic BP ${f.systolic_bp} mmHg, creatinine ${f.creatinine} mg/dL. ` +
    `Charlson index ${f.charlson_index}, ${f.comorbidity_count} comorbidities, ${f.prev_admissions} prior admissions, ` +
    `length of stay ${f.los_days} days. This text was produced locally for demonstration and is not a backend output.`
  )
}

export function buildDemoResult(features: PatientFeatures, presetId: string | null): PredictResponse {
  const p = DEMO_PROBABILITIES[presetId ?? ''] ?? DEMO_PROBABILITIES['documented-example']
  return {
    prediction: p >= 0.5 ? 1 : 0,
    prediction_label: p >= 0.5 ? 'readmitted_within_30_days' : 'not_readmitted_within_30_days',
    probability_readmitted_30d: p,
    clinical_note: demoNote(features),
    rag_score: Number((p * 0.9 + 0.04).toFixed(4)),
    rag_min_dist: Number((1.2 - p).toFixed(4)),
    model: DEMO_MODEL_NAME,
  }
}

const EXTRA_PROBABILITIES = [0.2241, 0.6612, 0.0934, 0.5487, 0.7356, 0.3318, 0.2789, 0.9021]

export function buildDemoDataset(): PredictionRecord[] {
  const now = Date.now()
  return EXTRA_PROBABILITIES.map((p, i) => {
    const base = SAMPLE_PATIENTS[i % SAMPLE_PATIENTS.length].features
    const features: PatientFeatures = {
      ...base,
      age: (base.age ?? 60) + ((i * 7) % 11) - 5,
      los_days: Math.max(1, (base.los_days ?? 3) + (i % 4) - 1),
    }
    const result = buildDemoResult(features, null)
    return {
      ref: generateRef('DEMO'),
      createdAt: new Date(now - i * 1000 * 60 * 60 * 9).toISOString(),
      source: 'demo',
      features,
      result: {
        ...result,
        probability_readmitted_30d: p,
        prediction: p >= 0.5 ? 1 : 0,
        prediction_label: p >= 0.5 ? 'readmitted_within_30_days' : 'not_readmitted_within_30_days',
      },
    }
  })
}
