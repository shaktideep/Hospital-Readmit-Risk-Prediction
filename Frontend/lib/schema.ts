import { z } from 'zod'
import icdByCategory from '@/config/icd10-by-category.json'
import type { FeatureKey, PatientFeatures } from './types'

/**
 * Single source of truth for the /predict input contract.
 *
 * Only the 17 features documented in the backend's example payload are listed.
 * No training notebook or backend source was supplied, so category vocabularies,
 * defaults and transformations are intentionally NOT invented here. If the fitted
 * preprocessing pipeline expects additional columns, add them to
 * `REQUIRED_BACKEND_FEATURES` (the form will then report them as missing) and
 * add a matching entry to `FEATURE_FIELDS`.
 */
export const REQUIRED_BACKEND_FEATURES: readonly string[] = [
  'age',
  'gender',
  'state_patient',
  'admit_type',
  'ward_type',
  'primary_diag_category',
  'primary_icd10',
  'hba1c',
  'systolic_bp',
  'creatinine',
  'charlson_index',
  'num_procedures',
  'los_days',
  'prev_admissions',
  'comorbidity_count',
  'total_cost_inr',
  'out_of_pocket_inr',
]

export type SectionId = 'patient' | 'admission' | 'clinical' | 'history' | 'financial'

export interface FeatureSection {
  id: SectionId
  letter: string
  title: string
  description: string
}

export const FEATURE_SECTIONS: FeatureSection[] = [
  { id: 'patient', letter: 'A', title: 'Patient information', description: 'Basic, non-identifying demographics.' },
  { id: 'admission', letter: 'B', title: 'Admission details', description: 'How and why the patient was admitted.' },
  { id: 'clinical', letter: 'C', title: 'Clinical measurements', description: 'Most recent laboratory and vital values.' },
  { id: 'history', letter: 'D', title: 'Medical history & severity', description: 'Comorbidity burden and utilisation.' },
  { id: 'financial', letter: 'E', title: 'Financial information', description: 'Episode cost in Indian rupees.' },
]

interface BaseField {
  key: FeatureKey
  section: SectionId
  label: string
  description: string
}

export interface NumberField extends BaseField {
  kind: 'number'
  unit?: string
  min: number
  max: number
  step: number
  integer?: boolean
  placeholder: string
}

/**
 * A string feature whose valid values come from the fitted model. Options are never
 * defined here; they are loaded from the backend schema endpoint or
 * `config/model-categories.json` (see `useCategories`).
 */
export interface CategoricalField extends BaseField {
  kind: 'categorical'
  placeholder: string
}

export type FeatureField = NumberField | CategoricalField

/** Value used for a categorical feature that is missing from a pasted clinical note. */
export const UNKNOWN_CATEGORY = 'Unknown'

const CATEGORY_HINT = 'Must match a category used during model training.'

export const FEATURE_FIELDS: FeatureField[] = [
  { key: 'age', section: 'patient', kind: 'number', label: 'Age', unit: 'years', min: 0, max: 120, step: 1, integer: true, placeholder: '67', description: 'Patient age at admission.' },
  { key: 'gender', section: 'patient', kind: 'categorical', label: 'Gender', placeholder: 'Select gender', description: CATEGORY_HINT },
  { key: 'state_patient', section: 'patient', kind: 'categorical', label: 'State / region', placeholder: 'Select state', description: 'Indian state of residence. ' + CATEGORY_HINT },

  { key: 'admit_type', section: 'admission', kind: 'categorical', label: 'Admission type', placeholder: 'Select admission type', description: CATEGORY_HINT },
  { key: 'ward_type', section: 'admission', kind: 'categorical', label: 'Ward type', placeholder: 'Select ward type', description: CATEGORY_HINT },
  { key: 'primary_diag_category', section: 'admission', kind: 'categorical', label: 'Primary diagnosis category', placeholder: 'Select diagnosis category', description: CATEGORY_HINT },
  { key: 'primary_icd10', section: 'admission', kind: 'categorical', label: 'Primary ICD-10 code', placeholder: 'Select ICD-10 code', description: 'ICD-10 code of the principal diagnosis. ' + CATEGORY_HINT },

  { key: 'hba1c', section: 'clinical', kind: 'number', label: 'HbA1c', unit: '%', min: 3, max: 20, step: 0.1, placeholder: '7.4', description: 'Glycated haemoglobin.' },
  { key: 'systolic_bp', section: 'clinical', kind: 'number', label: 'Systolic blood pressure', unit: 'mmHg', min: 50, max: 300, step: 1, placeholder: '148', description: 'Systolic reading.' },
  { key: 'creatinine', section: 'clinical', kind: 'number', label: 'Creatinine', unit: 'mg/dL', min: 0, max: 20, step: 0.01, placeholder: '1.1', description: 'Serum creatinine.' },

  { key: 'charlson_index', section: 'history', kind: 'number', label: 'Charlson comorbidity index', min: 0, max: 40, step: 1, integer: true, placeholder: '3', description: 'Weighted comorbidity score.' },
  { key: 'num_procedures', section: 'history', kind: 'number', label: 'Number of procedures', min: 0, max: 100, step: 1, integer: true, placeholder: '2', description: 'Procedures during this stay.' },
  { key: 'los_days', section: 'history', kind: 'number', label: 'Length of stay', unit: 'days', min: 0, max: 365, step: 1, placeholder: '5', description: 'Days from admission to discharge.' },
  { key: 'prev_admissions', section: 'history', kind: 'number', label: 'Previous admissions', min: 0, max: 100, step: 1, integer: true, placeholder: '2', description: 'Prior inpatient admissions.' },
  { key: 'comorbidity_count', section: 'history', kind: 'number', label: 'Comorbidity count', min: 0, max: 50, step: 1, integer: true, placeholder: '4', description: 'Number of recorded comorbidities.' },

  { key: 'total_cost_inr', section: 'financial', kind: 'number', label: 'Total cost', unit: 'INR', min: 0, max: 100_000_000, step: 1, placeholder: '25000', description: 'Total episode cost.' },
  { key: 'out_of_pocket_inr', section: 'financial', kind: 'number', label: 'Out-of-pocket expenditure', unit: 'INR', min: 0, max: 100_000_000, step: 1, placeholder: '4000', description: 'Amount paid directly by the patient.' },
]

/**
 * ICD-10 codes grouped by the diagnosis category they belong to (by ICD-10 chapter).
 * Used only to narrow the ICD-10 dropdown; the model's own code list stays authoritative.
 */
const ICD10_BY_CATEGORY = icdByCategory as Record<string, string[]>

/** Returns the codes in `allCodes` that belong to `category`, or null when no filter applies. */
export function icdOptionsFor(category: unknown, allCodes: string[]): string[] | null {
  if (typeof category !== 'string') return null
  const codes = ICD10_BY_CATEGORY[category.trim()]
  if (!codes) return null
  const subset = allCodes.filter((c) => codes.includes(c))
  return subset.length > 0 ? subset : null
}

export const FIELD_BY_KEY = Object.fromEntries(FEATURE_FIELDS.map((f) => [f.key, f])) as Record<FeatureKey, FeatureField>

/** Backend features with no form field. Non-empty means the payload would be incomplete. */
export function getMissingFeatures(): string[] {
  const configured = new Set<string>(FEATURE_FIELDS.map((f) => f.key))
  return REQUIRED_BACKEND_FEATURES.filter((k) => !configured.has(k))
}

function numberSchema(field: NumberField) {
  let schema = z
    .number({ error: `${field.label} is required` })
    .refine((v) => Number.isFinite(v), `${field.label} must be a number`)
    .refine((v) => v >= field.min, `Must be at least ${field.min}`)
    .refine((v) => v <= field.max, `Must be at most ${field.max.toLocaleString('en-IN')}`)
  if (field.integer) schema = schema.refine((v) => Number.isInteger(v), 'Must be a whole number')
  return schema
}

function categoricalSchema(field: CategoricalField) {
  return z
    .string({ error: `Select a ${field.label.toLowerCase()}` })
    .trim()
    .min(1, `Select a ${field.label.toLowerCase()}`)
    .max(120, 'Too long')
    .refine((v) => v !== UNKNOWN_CATEGORY, `Select a ${field.label.toLowerCase()}`)
}

const shape = Object.fromEntries(
  FEATURE_FIELDS.map((f) => [f.key, f.kind === 'number' ? numberSchema(f) : categoricalSchema(f)]),
)

export const CATEGORICAL_FIELDS = FEATURE_FIELDS.filter((f): f is CategoricalField => f.kind === 'categorical')
export type CategoricalOptions = Partial<Record<FeatureKey, string[]>>

export const patientFeaturesSchema = z
  .object(shape)
  .superRefine((v, ctx) => {
    const total = v.total_cost_inr as number
    const oop = v.out_of_pocket_inr as number
    if (Number.isFinite(total) && Number.isFinite(oop) && oop > total) {
      ctx.addIssue({ code: 'custom', path: ['out_of_pocket_inr'], message: 'Cannot exceed total cost' })
    }
  }) as unknown as z.ZodType<PatientFeatures>

export type PatientFormValues = Partial<Record<FeatureKey, string | number>>

export const EMPTY_FORM_VALUES = Object.fromEntries(
  FEATURE_FIELDS.map((f) => [f.key, f.kind === 'number' ? Number.NaN : '']),
) as unknown as PatientFeatures

export interface SamplePatient {
  id: string
  name: string
  summary: string
  features: PatientFeatures
}

/** Synthetic presets for demonstrations. Categories use values from the trained model's vocabulary. */
export const SAMPLE_PATIENTS: SamplePatient[] = [
  {
    id: 'documented-example',
    name: 'Emergency admission',
    summary: '67 years, emergency admission, endocrine diagnosis',
    features: {
      age: 67, gender: 'F', state_patient: 'Odisha', admit_type: 'Emergency', ward_type: 'General',
      primary_diag_category: 'Endocrine', primary_icd10: 'E11', hba1c: 7.4, systolic_bp: 148, creatinine: 1.1,
      charlson_index: 3, num_procedures: 2, los_days: 5, prev_admissions: 2, comorbidity_count: 4,
      total_cost_inr: 25000, out_of_pocket_inr: 4000,
    },
  },
  {
    id: 'high-utiliser',
    name: 'High-utilisation patient',
    summary: '78 years, long hospital stay, frequent previous admissions',
    features: {
      age: 78, gender: 'M', state_patient: 'Odisha', admit_type: 'Emergency', ward_type: 'General',
      primary_diag_category: 'Endocrine', primary_icd10: 'E11', hba1c: 9.8, systolic_bp: 172, creatinine: 2.3,
      charlson_index: 7, num_procedures: 5, los_days: 14, prev_admissions: 6, comorbidity_count: 8,
      total_cost_inr: 145000, out_of_pocket_inr: 38000,
    },
  },
  {
    id: 'stable-short-stay',
    name: 'Stable short-stay patient',
    summary: '42 years, well-controlled condition, first admission',
    features: {
      age: 42, gender: 'F', state_patient: 'Odisha', admit_type: 'Emergency', ward_type: 'General',
      primary_diag_category: 'Endocrine', primary_icd10: 'E11', hba1c: 6.1, systolic_bp: 124, creatinine: 0.8,
      charlson_index: 0, num_procedures: 1, los_days: 2, prev_admissions: 0, comorbidity_count: 1,
      total_cost_inr: 12000, out_of_pocket_inr: 1500,
    },
  },
]

export function toPayload(values: PatientFeatures): PatientFeatures {
  const out: Record<string, string | number | null> = {}
  for (const f of FEATURE_FIELDS) {
    const v = values[f.key]
    out[f.key] = typeof v === 'string' ? v.trim() : v
  }
  return out as unknown as PatientFeatures
}
