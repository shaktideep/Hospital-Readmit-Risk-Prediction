'use client'

import { useSyncExternalStore } from 'react'
import type { PredictionRecord } from './types'

const STORAGE_KEY = 'caresense:history:v1'
const MAX_RECORDS = 500
const EMPTY: PredictionRecord[] = []

const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cachedRecords: PredictionRecord[] = EMPTY

function read(): PredictionRecord[] {
  if (typeof window === 'undefined') return EMPTY
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return EMPTY
  }
  if (raw === cachedRaw) return cachedRecords
  cachedRaw = raw
  try {
    const parsed = raw ? JSON.parse(raw) : []
    cachedRecords = Array.isArray(parsed) ? (parsed as PredictionRecord[]) : EMPTY
  } catch {
    cachedRecords = EMPTY
  }
  return cachedRecords
}

function write(records: PredictionRecord[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)))
  } catch {
    // Storage full or disabled — history is best-effort.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useHistory() {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

const hydratedSubscribe = () => () => {}
export function useHydrated() {
  return useSyncExternalStore(hydratedSubscribe, () => true, () => false)
}

export function saveRecord(record: PredictionRecord) {
  const existing = read().filter((r) => r.ref !== record.ref)
  write([record, ...existing])
}

export function saveRecords(records: PredictionRecord[]) {
  const refs = new Set(records.map((r) => r.ref))
  write([...records, ...read().filter((r) => !refs.has(r.ref))])
}

export function deleteRecord(ref: string) {
  write(read().filter((r) => r.ref !== ref))
}

export function clearRecords(source?: PredictionRecord['source']) {
  write(source ? read().filter((r) => r.source !== source) : [])
}

export function hasRecord(records: PredictionRecord[], ref: string) {
  return records.some((r) => r.ref === ref)
}
