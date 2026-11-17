'use client'

import { useSyncExternalStore } from 'react'

const KEY = 'caresense:demo-mode'
const listeners = new Set<() => void>()

function read() {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function setDemoMode(enabled: boolean) {
  try {
    if (enabled) window.localStorage.setItem(KEY, '1')
    else window.localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  listeners.forEach((l) => l())
}

export function useDemoMode() {
  return useSyncExternalStore(subscribe, read, () => false)
}
