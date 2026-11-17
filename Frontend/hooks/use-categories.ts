'use client'

import useSWR from 'swr'
import { fetchCategories, SCHEMA_PATH } from '@/lib/api'
import { CATEGORICAL_FIELDS, type CategoricalOptions } from '@/lib/schema'
import type { FeatureKey } from '@/lib/types'
import localCategories from '@/config/model-categories.json'

export type CategorySource = 'backend' | 'local'

export interface CategoriesState {
  loading: boolean
  options: CategoricalOptions
  sources: Partial<Record<FeatureKey, CategorySource>>
  /** Categorical features with no verified list of valid values. */
  missingKeys: FeatureKey[]
  backendError: string | null
  schemaPath: string
  isValidating: boolean
  refresh: () => Promise<unknown>
}

function cleanLocal(raw: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' && x.length > 0)) out[k] = v as string[]
  }
  return out
}

const LOCAL = cleanLocal(localCategories)

/** Backend values take precedence; `config/model-categories.json` fills any gaps. Nothing is invented. */
export function useCategories(): CategoriesState {
  const { data, isValidating, mutate } = useSWR('caresense:categories', fetchCategories, {
    revalidateOnFocus: false,
    dedupingInterval: 5_000,
  })

  const options: CategoricalOptions = {}
  const sources: Partial<Record<FeatureKey, CategorySource>> = {}
  for (const f of CATEGORICAL_FIELDS) {
    const fromBackend = data?.categories[f.key]
    if (fromBackend?.length) {
      options[f.key] = fromBackend
      sources[f.key] = 'backend'
    } else if (LOCAL[f.key]?.length) {
      options[f.key] = LOCAL[f.key]
      sources[f.key] = 'local'
    }
  }

  return {
    loading: !data,
    options,
    sources,
    missingKeys: CATEGORICAL_FIELDS.filter((f) => !options[f.key]).map((f) => f.key),
    backendError: data?.error ?? null,
    schemaPath: SCHEMA_PATH,
    isValidating,
    refresh: () => mutate(),
  }
}
