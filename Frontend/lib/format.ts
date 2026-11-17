import type { PredictionRecord } from './types'

export const DECISION_THRESHOLD = 0.5

export function formatProbability(p: number) {
  return `${(p * 100).toFixed(2)}%`
}

export function isReadmitted(label: string) {
  return label === 'readmitted_within_30_days'
}

export function labelText(label: string) {
  if (label === 'readmitted_within_30_days') return 'Predicted readmission within 30 days'
  if (label === 'not_readmitted_within_30_days') return 'No readmission predicted within 30 days'
  return label.replace(/_/g, ' ')
}

export function shortLabel(label: string) {
  if (label === 'readmitted_within_30_days') return 'Readmission'
  if (label === 'not_readmitted_within_30_days') return 'No readmission'
  return label.replace(/_/g, ' ')
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNumber(n: number, digits = 4) {
  return Number.isFinite(n) ? n.toFixed(digits) : '—'
}

export function generateRef(prefix = 'CS') {
  const t = Date.now().toString(36).toUpperCase().slice(-5)
  const r = Math.random().toString(36).toUpperCase().slice(2, 5)
  return `${prefix}-${t}${r}`
}

export function buildSummary(record: PredictionRecord) {
  const { result, features } = record
  const lines = [
    `CareSense — 30-Day Readmission Estimate${record.source === 'demo' ? ' (DEMO DATA — NOT A LIVE MODEL RESULT)' : ''}`,
    `Reference: ${record.ref}`,
    `Generated: ${formatDateTime(record.createdAt)}`,
    `Model: ${result.model}`,
    '',
    `Probability of readmission within 30 days: ${formatProbability(result.probability_readmitted_30d)}`,
    `Model output: ${labelText(result.prediction_label)} (decision threshold ${DECISION_THRESHOLD})`,
    '',
    'Patient inputs:',
    ...Object.entries(features).map(([k, v]) => `  ${k}: ${v}`),
    '',
    'Clinical note (backend generated):',
    result.clinical_note,
    '',
    `RAG score: ${formatNumber(result.rag_score)}  |  RAG min distance: ${formatNumber(result.rag_min_dist)}`,
    '',
    'This is a model estimate intended to support, not replace, professional clinical judgment.',
  ]
  return lines.join('\n')
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
