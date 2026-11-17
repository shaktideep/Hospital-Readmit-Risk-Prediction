'use client'

import useSWR from 'swr'
import { fetchHealth } from '@/lib/api'
import type { HealthState } from '@/lib/types'

export function useHealth() {
  const { data, isValidating, mutate } = useSWR('caresense:health', fetchHealth, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 2_000,
  })
  const state: HealthState = data ? data.state : 'checking'
  return { snapshot: data, state, isChecking: isValidating, refresh: () => mutate() }
}

export const HEALTH_COPY: Record<HealthState, { label: string; description: string }> = {
  checking: { label: 'Checking…', description: 'Contacting the CareSense API.' },
  ready: { label: 'Model ready', description: 'API reachable, model loaded and inference probe passed.' },
  degraded: { label: 'Degraded', description: 'API reachable, but the inference probe did not pass.' },
  not_ready: { label: 'Model not ready', description: 'API reachable, but model artifacts are not loaded.' },
  unreachable: { label: 'API unreachable', description: 'The FastAPI backend could not be contacted.' },
  not_configured: {
    label: 'Not configured',
    description: 'Backend URL not configured. Set NEXT_PUBLIC_API_BASE_URL.',
  },
}
