import type { Metadata } from 'next'
import { PredictWorkflow } from '@/components/prediction/predict-workflow'

export const metadata: Metadata = { title: 'New Prediction' }

export default function PredictPage() {
  return <PredictWorkflow />
}
