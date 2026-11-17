import icdByCategory from '@/config/icd10-by-category.json'
import { FEATURE_FIELDS, type CategoricalOptions, type FeatureField } from './schema'
import type { FeatureKey, PatientFeatures } from './types'

/**
 * Extracts the 17 model features from a clinical note. Two styles are supported:
 *
 * 1. The backend's `generate_clinical_note(row)` output:
 *      Patient: {age} yr old {gender}, {state}. Admit: {admit_type}, Ward: {ward_type}.
 *      Primary DX: {category} ({icd10}). Vitals/Labs: HbA1c {hba1c}, BP {systolic_bp}, Creatinine {creatinine}.
 *      Severity: {charlson} Charlson, {procedures} procedures, {los} days stay.
 *      History: {prev} prior admissions, {comorbidities} comorbidities.
 *
 * 2. Free text, e.g. "78-year-old m from Odisha, emergency admission to general ward for
 *    endocrine (E11). HbA1c 9.8%, systolic BP 172 mmHg, ..., length of stay 14 days."
 *
 * Every field has its own ordered list of patterns, so a field is never inferred from the
 * position of another. Categorical values are accepted only when they map onto a configured
 * option, and numeric values only when they are inside the field's allowed range. Anything
 * else is left out of `values` entirely, so callers never write "Unknown" or null into the form.
 */

const NUM = String.raw`([-+]?\d+(?:\.\d+)?)`
const SEP = String.raw`\s*(?:of|is|was|at|[:=\-–])?\s*`
const MONEY = String.raw`(?:₹|INR|Rs\.?)?\s*([\d,]+(?:\.\d+)?)`
const GENDER_TOKEN = String.raw`(?:male|female|man|woman|other|[MFU])`
const OLD = String.raw`(?:yrs?|years?|y\/?o)\.?[-\s]*old`
const ICD_CODE = String.raw`[A-TV-Z]\d{2}(?:\.\w+)?`

const PATTERNS: Record<FeatureKey, RegExp[]> = {
  age: [
    new RegExp(String.raw`\b(\d{1,3}|U)\s*[-\s]?\s*${OLD}\b`, 'i'),
    new RegExp(String.raw`\bage${SEP}(\d{1,3}|U)\b`, 'i'),
    /\b(\d{1,3})\s*(?:yrs?|years?)\b/i,
  ],
  gender: [
    new RegExp(String.raw`\b${OLD}\s+(${GENDER_TOKEN})\b`, 'i'),
    /\b(?:gender|sex)\s*[:=\-–]?\s*(male|female|man|woman|other|[MFU])\b/i,
    /\b(male|female)\b/i,
  ],
  state_patient: [
    new RegExp(String.raw`\b${OLD}\s+${GENDER_TOKEN}\s*,\s*([^,.;]+?)\s*(?=[,.;])`, 'i'),
    /\b(?:state|region)\s*[:=\-–]\s*([A-Za-z][A-Za-z ]*?)\s*(?=[,.;]|$)/i,
    /\b(?:from|resident\s+of|resides\s+in|living\s+in|lives\s+in)\s+([A-Za-z][A-Za-z ]*?)\s*(?=[,.;]|$)/i,
  ],
  admit_type: [
    /\b(?:Admit(?:ted)?|Admission)(?:\s*type)?\s*[:=\-–]\s*([^,.;]+?)\s*(?=[,.;]|$)/i,
    /\badmitted\s+(?:as\s+(?:an?\s+)?|via\s+|through\s+)([A-Za-z]+)/i,
    /\b(emergency|elective|OPD)\s+(?:admission|admit|case)\b/i,
    /\b(emergency|elective|OPD)\s+(?:patient|presentation|visit)\b/i,
  ],
  ward_type: [
    /\bWard(?:\s*type)?\s*[:=\-–]\s*([^,.;]+?)\s*(?=[,.;]|$)/i,
    /\b(?:in|to|into)\s+(?:the\s+)?(ICU|HDU|NICU|general)\s+ward\b/i,
    /\b(?!(?:the|a|an|this|that|his|her|our)\b)([A-Za-z]+)\s+ward\b/i,
    /\b(ICU|HDU|NICU)\b/,
  ],
  primary_diag_category: [
    /\bPrimary\s*(?:DX|diagnosis)(?:\s*category)?\s*[:=\-–]\s*([^(.;]+?)\s*(?:\(|[.;]|$)/i,
    /\b(?:diagnosis|DX)\s*(?:category)?\s*[:=\-–]\s*([^(.;]+?)\s*(?:\(|[.;]|$)/i,
    new RegExp(String.raw`\b(?:for|with|of)\s+([A-Za-z][A-Za-z ]*?)\s*\(\s*(?:ICD-?10\s*[:=]?\s*)?${ICD_CODE}`, 'i'),
  ],
  primary_icd10: [
    /\bPrimary\s*(?:DX|diagnosis)[^(]*\(\s*(?:ICD-?10\s*[:=]?\s*)?([^)]*?)\s*\)/i,
    new RegExp(String.raw`\bICD-?10(?:\s*code)?\s*[:=\-–]?\s*(${ICD_CODE})\b`, 'i'),
    new RegExp(String.raw`\(\s*(${ICD_CODE})\s*\)`),
  ],
  hba1c: [
    new RegExp(String.raw`\bHb\s?A1c${SEP}${NUM}`, 'i'),
    new RegExp(String.raw`\bglycated\s+h(?:a)?emoglobin${SEP}${NUM}`, 'i'),
    new RegExp(String.raw`\bA1c${SEP}${NUM}`, 'i'),
    /\bHb\s?A1c\s*[:=]?\s*(U)\b/i,
  ],
  systolic_bp: [
    new RegExp(String.raw`\b(?:systolic\s+)?(?:BP|blood\s+pressure)${SEP}${NUM}(?:\s*\/\s*\d+)?`, 'i'),
    new RegExp(String.raw`\bsystolic(?:\s+BP|\s+blood\s+pressure)?${SEP}${NUM}`, 'i'),
    /\b(?:BP|blood\s+pressure)\s*[:=]?\s*(U)\b/i,
  ],
  creatinine: [
    new RegExp(String.raw`\b(?:serum\s+)?creatinine${SEP}${NUM}`, 'i'),
    /\bcreatinine\s*[:=]?\s*(U)\b/i,
  ],
  charlson_index: [
    new RegExp(String.raw`\b${NUM}\s*Charlson\b`, 'i'),
    new RegExp(String.raw`\bCharlson(?:\s+(?:comorbidity\s+)?(?:index|score))?${SEP}${NUM}`, 'i'),
    /\b(U)\s*Charlson\b/i,
  ],
  num_procedures: [
    new RegExp(String.raw`\b${NUM}\s+procedures?\b`, 'i'),
    new RegExp(String.raw`\b(?:number\s+of\s+)?procedures?(?:\s+count)?${SEP}${NUM}`, 'i'),
    /\b(U)\s+procedures?\b/i,
  ],
  los_days: [
    new RegExp(String.raw`\b${NUM}\s*[-\s]?days?(?:\s+of)?\s+(?:stay|hospital\s+stay|length\s+of\s+stay|admission|in\s+hospital)`, 'i'),
    new RegExp(String.raw`\b(?:length\s+of\s+stay|LOS)${SEP}${NUM}`, 'i'),
    new RegExp(String.raw`\bstay(?:ed)?(?:\s+for)?${SEP}${NUM}\s*days?`, 'i'),
    /\b(U)\s+days?\s+stay\b/i,
  ],
  prev_admissions: [
    new RegExp(String.raw`\b${NUM}\s+(?:prior|previous|prev\.?|earlier)\s+(?:hospital\s+)?admissions?`, 'i'),
    new RegExp(String.raw`\b(?:prior|previous|prev\.?)\s+admissions?(?:\s+count)?${SEP}${NUM}`, 'i'),
    /\b(U)\s+(?:prior|previous)\s+admissions?\b/i,
  ],
  comorbidity_count: [
    new RegExp(String.raw`\b${NUM}\s+(?:co-?morbidit(?:y|ies))`, 'i'),
    new RegExp(String.raw`\bco-?morbidit(?:y|ies)(?:\s+count)?${SEP}${NUM}`, 'i'),
    /\b(U)\s+co-?morbidit(?:y|ies)\b/i,
  ],
  total_cost_inr: [
    new RegExp(String.raw`\btotal\s*(?:cost|charges?|bill)(?:\s*\(?\s*INR\s*\)?)?${SEP}${MONEY}`, 'i'),
  ],
  out_of_pocket_inr: [
    new RegExp(
      String.raw`\bout[-\s]*of[-\s]*pocket(?:\s*(?:expenditure|expense|cost|spend|payment|OOP))?(?:\s*\(?\s*INR\s*\)?)?${SEP}${MONEY}`,
      'i',
    ),
    new RegExp(String.raw`\bOOP(?:\s*\(?\s*INR\s*\)?)?${SEP}${MONEY}`),
  ],
}

const MISSING_TOKEN = /^(?:u|unknown|nan|none|null|n\/?a|-+)?$/i

export interface ReviewItem {
  key: FeatureKey
  raw: string
  reason: string
}

export interface ParsedNote {
  /** Only the features that were extracted and validated. Missing features are absent, never null/"Unknown". */
  values: Partial<PatientFeatures>
  /** Features read from the note and validated. */
  extracted: FeatureKey[]
  /** Features the note does not state. */
  missing: FeatureKey[]
  /** Features that were stated but could not be mapped to a valid value. */
  review: ReviewItem[]
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function firstMatch(patterns: RegExp[], text: string): string | null {
  for (const re of patterns) {
    const token = re.exec(text)?.[1]?.trim()
    if (token !== undefined) return token
  }
  return null
}

const GENDER_WORDS: Record<string, string[]> = {
  male: ['male', 'man', 'm', 'boy'],
  female: ['female', 'woman', 'f', 'girl'],
  other: ['other', 'o', 'non binary', 'nonbinary'],
}

function mapGender(raw: string, options: string[]): string | null {
  const n = norm(raw)
  const group = Object.entries(GENDER_WORDS).find(([, words]) => words.includes(n))?.[0]
  if (!group) return options.find((o) => norm(o) === n) ?? null
  return (
    options.find((o) => GENDER_WORDS[group].includes(norm(o))) ??
    options.find((o) => norm(o).startsWith(group)) ??
    null
  )
}

/** Exact match first, then a unique contains match ("Endocrine disorders" -> "Endocrine"). */
function mapCategory(raw: string, options: string[]): string | null {
  const n = norm(raw)
  if (!n) return null
  const exact = options.find((o) => norm(o) === n)
  if (exact) return exact
  const padded = ` ${n} `
  const loose = options.filter((o) => {
    const on = norm(o)
    return on.length > 1 && (padded.includes(` ${on} `) || ` ${on} `.includes(padded))
  })
  return loose.length === 1 ? loose[0] : null
}

function mapIcd(raw: string, options: string[]): string | null {
  const code = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (!new RegExp(`^${ICD_CODE}$`).test(code)) return null
  if (options.includes(code)) return code
  const root = code.slice(0, 3)
  return options.includes(root) ? root : null
}

function categoryForIcd(code: string): string | null {
  const root = code.slice(0, 3)
  const hit = Object.entries(icdByCategory as Record<string, string[]>).find(([, codes]) => codes.includes(root))
  return hit?.[0] ?? null
}

/** A configured option that appears as a whole word in the text, when exactly one does. */
function scanOptions(text: string, options: string[]): string | null {
  const hay = ` ${norm(text)} `
  const hits = options.filter((o) => hay.includes(` ${norm(o)} `))
  return hits.length === 1 ? hits[0] : null
}

function validateNumber(field: Extract<FeatureField, { kind: 'number' }>, raw: string): { value: number } | { reason: string } {
  const n = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(n)) return { reason: 'not a number' }
  if (n < field.min || n > field.max) return { reason: `outside ${field.min}–${field.max}` }
  if (field.integer && !Number.isInteger(n)) return { reason: 'must be a whole number' }
  return { value: n }
}

export function parseClinicalNote(note: string, options: CategoricalOptions = {}): ParsedNote {
  const text = note.replace(/\s+/g, ' ').trim()
  const values: Record<string, string | number> = {}
  const extracted: FeatureKey[] = []
  const missing: FeatureKey[] = []
  const review: ReviewItem[] = []

  const tokens = {} as Record<FeatureKey, string | null>
  for (const field of FEATURE_FIELDS) {
    const token = firstMatch(PATTERNS[field.key], text)
    tokens[field.key] = token === null || MISSING_TOKEN.test(token) ? null : token
  }

  // Independent fallbacks for categories that are stated as a bare word rather than a labelled phrase.
  const scanFallbacks: FeatureKey[] = ['state_patient', 'admit_type', 'primary_diag_category']
  for (const key of scanFallbacks) {
    const allowed = options[key]
    if (tokens[key] === null && allowed?.length) tokens[key] = scanOptions(text, allowed)
  }

  for (const field of FEATURE_FIELDS) {
    const token = tokens[field.key]

    if (field.kind === 'number') {
      if (token === null) {
        missing.push(field.key)
        continue
      }
      const result = validateNumber(field, token)
      if ('value' in result) {
        values[field.key] = result.value
        extracted.push(field.key)
      } else {
        review.push({ key: field.key, raw: token, reason: result.reason })
      }
      continue
    }

    const allowed = options[field.key] ?? []
    let mapped: string | null = null
    let raw = token

    if (token === null && field.key === 'primary_diag_category' && tokens.primary_icd10) {
      const inferred = categoryForIcd(tokens.primary_icd10.toUpperCase().replace(/\s+/g, ''))
      mapped = inferred ? mapCategory(inferred, allowed) : null
      raw = mapped ? inferred : null
    }

    if (raw === null) {
      missing.push(field.key)
      continue
    }

    if (allowed.length === 0) {
      review.push({ key: field.key, raw, reason: 'no configured options to validate against' })
      continue
    }

    if (mapped === null) {
      if (field.key === 'gender') mapped = mapGender(raw, allowed)
      else if (field.key === 'primary_icd10') mapped = mapIcd(raw, allowed)
      else mapped = mapCategory(raw, allowed)
    }
    if (mapped === null && field.key === 'state_patient') mapped = scanOptions(text, allowed)

    if (mapped) {
      values[field.key] = mapped
      extracted.push(field.key)
    } else {
      review.push({ key: field.key, raw, reason: 'not a category the model supports' })
    }
  }

  return { values: values as Partial<PatientFeatures>, extracted, missing, review }
}
