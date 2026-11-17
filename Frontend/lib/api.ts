import { z } from 'zod'
import type { HealthResponse, HealthSnapshot, PatientFeatures, PredictResponse } from './types'

export const MISSING_URL_MESSAGE = 'Backend URL not configured. Set NEXT_PUBLIC_API_BASE_URL.'

// Must be read as a literal property access so Next.js can inline it at build time.
const RAW_API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()

function validateBaseUrl(raw: string): string | null {
  if (!raw) return MISSING_URL_MESSAGE
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return 'NEXT_PUBLIC_API_BASE_URL is not a valid URL. Use the form https://your-backend.example.com (no trailing path).'
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'NEXT_PUBLIC_API_BASE_URL must start with https:// (or http:// for local development).'
  }
  if (/\/(predict|health|schema)\/?$/.test(url.pathname)) {
    return 'NEXT_PUBLIC_API_BASE_URL must be the base URL only, without /predict, /health or /schema.'
  }
  return null
}

/** Null when the base URL is present and well-formed; otherwise a user-facing explanation. */
export const API_CONFIG_ERROR: string | null = validateBaseUrl(RAW_API_BASE_URL)
export const API_BASE_URL_CONFIGURED = API_CONFIG_ERROR === null
export const API_BASE_URL = API_BASE_URL_CONFIGURED ? RAW_API_BASE_URL.replace(/\/+$/, '') : ''

/** Path of the backend endpoint that lists valid categorical values. */
export const SCHEMA_PATH = process.env.NEXT_PUBLIC_SCHEMA_PATH || '/schema'

const PREDICT_TIMEOUT_MS = 20_000
const HEALTH_TIMEOUT_MS = 8_000

export type ApiErrorKind =
  | 'validation'
  | 'model_not_ready'
  | 'inference'
  | 'network'
  | 'cors'
  | 'config'
  | 'timeout'
  | 'malformed'
  | 'http'

export class ApiError extends Error {
  kind: ApiErrorKind
  status: number | null
  details: string[]
  /** Per-feature messages parsed from a FastAPI 422 response, keyed by feature name. */
  fieldErrors: Record<string, string>

  constructor(
    kind: ApiErrorKind,
    message: string,
    status: number | null = null,
    details: string[] = [],
    fieldErrors: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.details = details
    this.fieldErrors = fieldErrors
  }
}

function extractFieldErrors(body: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!body || typeof body !== 'object') return out
  const detail = (body as { detail?: unknown }).detail
  if (Array.isArray(detail)) {
    for (const d of detail) {
      if (!d || typeof d !== 'object') continue
      const loc = (d as { loc?: unknown }).loc
      if (!Array.isArray(loc)) continue
      const idx = loc.indexOf('features')
      const key = idx >= 0 ? loc[idx + 1] : undefined
      if (typeof key === 'string' && !out[key]) out[key] = truncate(String((d as { msg?: unknown }).msg ?? 'Invalid value'))
    }
  } else if (detail && typeof detail === 'object') {
    for (const listKey of ['missing', 'missing_features', 'missing_columns']) {
      const v = (detail as Record<string, unknown>)[listKey]
      if (Array.isArray(v)) for (const k of v) if (typeof k === 'string') out[k] = 'Required by the backend model'
    }
  }
  return out
}

const ERROR_TITLES: Record<ApiErrorKind, string> = {
  validation: 'The backend rejected the request',
  model_not_ready: 'Model is not ready',
  inference: 'Prediction failed on the server',
  network: 'Backend unreachable',
  cors: 'Blocked by CORS',
  config: 'Backend URL not configured',
  timeout: 'Request timed out',
  malformed: 'Unexpected response from backend',
  http: 'Request failed',
}

export function errorTitle(kind: ApiErrorKind) {
  return ERROR_TITLES[kind]
}

/** Converts FastAPI `detail` payloads into short, user-safe lines. */
function extractDetails(body: unknown): string[] {
  if (!body || typeof body !== 'object') return []
  const detail = (body as { detail?: unknown }).detail
  if (!detail) return []
  if (typeof detail === 'string') return [truncate(detail)]
  if (Array.isArray(detail)) {
    return detail.slice(0, 12).map((d) => {
      if (d && typeof d === 'object') {
        const loc = Array.isArray((d as { loc?: unknown }).loc)
          ? ((d as { loc: unknown[] }).loc.filter((p) => p !== 'body').join(' → '))
          : ''
        const msg = String((d as { msg?: unknown }).msg ?? 'Invalid value')
        return truncate(loc ? `${loc}: ${msg}` : msg)
      }
      return truncate(String(d))
    })
  }
  if (typeof detail === 'object') {
    const obj = detail as Record<string, unknown>
    const lines: string[] = []
    if (typeof obj.message === 'string') lines.push(truncate(obj.message))
    for (const key of ['missing', 'missing_features', 'missing_columns']) {
      const v = obj[key]
      if (Array.isArray(v) && v.length) lines.push(`Missing features: ${v.join(', ')}`)
    }
    return lines.length ? lines : [truncate(JSON.stringify(detail))]
  }
  return []
}

function truncate(s: string, max = 240) {
  const firstLine = s.split('\n')[0]
  return firstLine.length > max ? firstLine.slice(0, max) + '…' : firstLine
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]'])

/**
 * Browsers hide the reason a fetch failed. A `no-cors` probe tells the two main causes apart:
 * if it resolves the server is reachable and the original request was blocked by CORS.
 */
async function diagnoseFetchFailure(path: string): Promise<ApiError> {
  const base = new URL(API_BASE_URL)
  const pageIsLocal = LOCAL_HOSTS.has(window.location.hostname)

  if (!pageIsLocal && LOCAL_HOSTS.has(base.hostname)) {
    return new ApiError(
      'network',
      `${API_BASE_URL} points to a local address, which a deployed site cannot reach. Set NEXT_PUBLIC_API_BASE_URL to a publicly reachable HTTPS URL.`,
    )
  }
  if (window.location.protocol === 'https:' && base.protocol === 'http:') {
    return new ApiError(
      'network',
      `This page is served over HTTPS, but ${API_BASE_URL} is plain HTTP, so the browser blocked the request. Serve the backend over HTTPS.`,
    )
  }

  const probe = new AbortController()
  const timer = setTimeout(() => probe.abort(), 5_000)
  try {
    await fetch(`${API_BASE_URL}${path}`, { method: 'GET', mode: 'no-cors', signal: probe.signal })
    return new ApiError(
      'cors',
      `The backend at ${API_BASE_URL} is reachable, but the browser blocked the response (CORS). Add ${window.location.origin} to allow_origins in the FastAPI CORSMiddleware.`,
    )
  } catch {
    return new ApiError(
      'network',
      `Could not reach ${API_BASE_URL}. The server may be offline, the URL may be wrong, or its HTTPS certificate or DNS may be invalid.`,
    )
  } finally {
    clearTimeout(timer)
  }
}

async function request(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  if (API_CONFIG_ERROR) throw new ApiError('config', API_CONFIG_ERROR)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init.headers ?? {}) },
    })
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      throw new ApiError('timeout', `No response from ${API_BASE_URL} within ${timeoutMs / 1000}s.`)
    }
    throw await diagnoseFetchFailure(path)
  } finally {
    clearTimeout(timer)
  }
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

const predictResponseSchema = z.object({
  prediction: z.number(),
  prediction_label: z.string(),
  probability_readmitted_30d: z.number().min(0).max(1),
  clinical_note: z.string(),
  rag_score: z.number(),
  rag_min_dist: z.number(),
  model: z.string(),
})

export async function predict(features: PatientFeatures): Promise<PredictResponse> {
  const res = await request(
    '/predict',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ features }) },
    PREDICT_TIMEOUT_MS,
  )
  const body = await readJson(res)

  if (!res.ok) {
    const details = extractDetails(body)
    if (res.status === 422)
      throw new ApiError('validation', 'Some features are missing or invalid.', 422, details, extractFieldErrors(body))
    if (res.status === 503)
      throw new ApiError('model_not_ready', 'The model artifacts are not loaded on the server yet.', 503, details)
    if (res.status === 500)
      throw new ApiError('inference', 'The server could not complete inference for this input.', 500, details)
    throw new ApiError('http', `The server responded with HTTP ${res.status}.`, res.status, details)
  }

  const parsed = predictResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new ApiError(
      'malformed',
      'The response did not match the expected prediction format.',
      res.status,
      parsed.error.issues.slice(0, 6).map((i) => `${i.path.join('.') || 'response'}: ${i.message}`),
    )
  }
  return parsed.data
}

let lastSuccessfulAt: string | null = null

function isProbePassed(v: HealthResponse['prediction_check']) {
  if (v === true) return true
  if (typeof v === 'string') return ['ok', 'passed', 'pass', 'success', 'healthy', 'true'].includes(v.toLowerCase())
  return false
}

export function deriveHealthState(
  data: HealthResponse | null,
  httpStatus: number | null,
): HealthSnapshot['state'] {
  if (httpStatus === null) return 'unreachable'
  if (!data) return httpStatus === 503 ? 'not_ready' : 'degraded'
  if (data.model_loaded === false || httpStatus === 503) return 'not_ready'
  const statusOk = typeof data.status === 'string' ? ['ok', 'healthy', 'ready'].includes(data.status.toLowerCase()) : true
  if (data.model_loaded === true && isProbePassed(data.prediction_check) && statusOk && httpStatus < 400) return 'ready'
  return 'degraded'
}

/** Never throws: unreachable and HTTP errors are encoded in the snapshot. */
export async function fetchHealth(): Promise<HealthSnapshot> {
  const checkedAt = new Date().toISOString()
  try {
    const res = await request('/health', { method: 'GET' }, HEALTH_TIMEOUT_MS)
    const body = (await readJson(res)) as HealthResponse | null
    const data = body && typeof body === 'object' ? body : null
    const state = deriveHealthState(data, res.status)
    if (state === 'ready') lastSuccessfulAt = checkedAt
    const details = extractDetails(data)
    let error: string | null = null
    if (!res.ok) error = `GET ${API_BASE_URL}/health returned HTTP ${res.status}${details[0] ? `: ${details[0]}` : '.'}`
    else if (!data) error = `GET ${API_BASE_URL}/health responded, but not with a JSON object.`
    return {
      state,
      reachable: true,
      httpStatus: res.status,
      data,
      error,
      checkedAt,
      lastSuccessfulAt,
    }
  } catch (err) {
    return {
      state: err instanceof ApiError && err.kind === 'config' ? 'not_configured' : 'unreachable',
      reachable: false,
      httpStatus: null,
      data: null,
      error: err instanceof ApiError ? err.message : 'Unknown network error',
      checkedAt,
      lastSuccessfulAt,
    }
  }
}

export interface BackendCategories {
  /** Valid values per feature, exactly as the backend returned them. */
  categories: Record<string, string[]>
  error: string | null
  httpStatus: number | null
}

/**
 * Reads valid categorical values from `GET ${SCHEMA_PATH}`. Accepted bodies:
 * `{ "categorical_features": { feature: string[] } }`, `{ "categories": { ... } }`,
 * or a bare `{ feature: string[] }` map. Never throws.
 */
export async function fetchCategories(): Promise<BackendCategories> {
  let res: Response
  try {
    res = await request(SCHEMA_PATH, { method: 'GET' }, HEALTH_TIMEOUT_MS)
  } catch (err) {
    return { categories: {}, error: err instanceof ApiError ? err.message : 'Unknown network error', httpStatus: null }
  }
  if (!res.ok) {
    const message =
      res.status === 404
        ? `The backend has no category endpoint at GET ${SCHEMA_PATH}.`
        : `GET ${SCHEMA_PATH} responded with HTTP ${res.status}.`
    return { categories: {}, error: message, httpStatus: res.status }
  }
  const body = await readJson(res)
  if (!body || typeof body !== 'object') {
    return { categories: {}, error: `GET ${SCHEMA_PATH} did not return a JSON object.`, httpStatus: res.status }
  }
  const root = body as Record<string, unknown>
  const candidate = [root.categorical_features, root.categories, root.categorical].find(
    (v) => v && typeof v === 'object' && !Array.isArray(v),
  ) as Record<string, unknown> | undefined
  const source = candidate ?? root
  const categories: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(source)) {
    if (!Array.isArray(value) || value.length === 0) continue
    if (!value.every((v) => typeof v === 'string' && v.length > 0)) continue
    categories[key] = Array.from(new Set(value as string[]))
  }
  if (Object.keys(categories).length === 0) {
    return {
      categories,
      error: `GET ${SCHEMA_PATH} responded, but contained no lists of category values.`,
      httpStatus: res.status,
    }
  }
  return { categories, error: null, httpStatus: res.status }
}

export async function fetchServiceInfo(): Promise<Record<string, unknown> | null> {
  try {
    const res = await request('/', { method: 'GET' }, HEALTH_TIMEOUT_MS)
    if (!res.ok) return null
    const body = await readJson(res)
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}
