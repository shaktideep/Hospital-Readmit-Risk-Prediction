import type { Metadata } from 'next'
import { StatusView } from '@/components/status/status-view'

export const metadata: Metadata = { title: 'Model & API Status' }

export default function ModelStatusPage() {
  return <StatusView />
}
