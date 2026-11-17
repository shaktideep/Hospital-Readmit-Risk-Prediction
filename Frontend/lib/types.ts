export type PredictionLabel =
  | 'readmitted_within_30_days'
  | 'not_readmitted_within_30_days'

export interface PatientFeatures {
  age: number | null
  gender: string
  state_patient: string
  admit_type: string
  ward_type: string
  primary_diag_category: string
  primary_icd10: string
  hba1c: number | null
  systolic_bp: number | null
  creatinine: number | null
  charlson_index: number | null
  num_procedures: number | null
  los_days: number | null
  prev_admissions: number | null
  comorbidity_count: number | null
  total_cost_inr: number | null
  out_of_pocket_inr: number | null
}

export type FeatureKey = keyof PatientFeatures

export interface PredictRequest {
  features: PatientFeatures
}

export interface PredictResponse {
  prediction: number
  prediction_label: PredictionLabel | string
  probability_readmitted_30d: number
  clinical_note: string
  rag_score: number
  rag_min_dist: number
  model: string
}

export interface HealthResponse {
  status?: string
  model_loaded?: boolean
  prediction_check?: boolean | string | null
  test_prediction?: number | string | null
  test_probability?: number | null
  detail?: unknown
  [key: string]: unknown
}

export type HealthState =
  | 'checking'
  | 'ready'
  | 'degraded'
  | 'not_ready'
  | 'unreachable'
  | 'not_configured'

export interface HealthSnapshot {
  state: Exclude<HealthState, 'checking'>
  reachable: boolean
  httpStatus: number | null
  data: HealthResponse | null
  error: string | null
  checkedAt: string
  lastSuccessfulAt: string | null
}

export type PredictionSource = 'live' | 'demo'

export interface PredictionRecord {
  ref: string
  createdAt: string
  source: PredictionSource
  features: PatientFeatures
  result: PredictResponse
}
