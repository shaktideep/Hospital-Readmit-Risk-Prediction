'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Panel } from '@/components/shared/panel'
import { DECISION_THRESHOLD, isReadmitted } from '@/lib/format'
import type { PredictionRecord } from '@/lib/types'
import { ChartTooltip } from './chart-tooltip'

const POS = 'var(--chart-5)'
const NEG = 'var(--chart-1)'
const AXIS = { fontSize: 11, fill: 'var(--muted-foreground)' }

function LegendText(value: string) {
  return <span className="text-xs text-muted-foreground">{value}</span>
}

export function OutcomeChart({ records }: { records: PredictionRecord[] }) {
  const data = useMemo(() => {
    const pos = records.filter((r) => isReadmitted(r.result.prediction_label)).length
    return [
      { name: 'Readmission', value: pos, fill: POS },
      { name: 'No readmission', value: records.length - pos, fill: NEG },
    ]
  }, [records])
  const pct = records.length ? Math.round((data[0].value / records.length) * 100) : 0

  return (
    <Panel title="Outcome distribution" description="Model labels across records.">
      <div className="relative h-64" role="img" aria-label={`${data[0].value} readmission and ${data[1].value} no-readmission predictions`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="var(--card)" strokeWidth={2}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={LegendText} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-x-0 top-[38%] flex -translate-y-1/2 flex-col items-center">
          <span className="font-mono text-2xl font-semibold tabular">{`${pct}%`}</span>
          <span className="text-[11px] text-muted-foreground">readmission</span>
        </div>
      </div>
    </Panel>
  )
}

export function ProbabilityChart({ records }: { records: PredictionRecord[] }) {
  const data = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({ bin: `${i * 10}–${i * 10 + 10}%`, start: i * 10, count: 0 }))
    for (const r of records) {
      const idx = Math.min(9, Math.floor(r.result.probability_readmitted_30d * 10))
      bins[idx].count++
    }
    return bins
  }, [records])

  return (
    <Panel title="Probability distribution" description={`Predicted probability, binned. Dashed line marks the ${DECISION_THRESHOLD} threshold.`}>
      <div className="h-64" role="img" aria-label="Histogram of predicted readmission probabilities">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="bin" tick={AXIS} tickLine={false} axisLine={false} interval={1} />
            <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
            <ReferenceLine x="50–60%" stroke="var(--foreground)" strokeDasharray="4 4" strokeOpacity={0.5} position="start" />
            <Bar dataKey="count" name="Predictions" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.bin} fill={d.start >= DECISION_THRESHOLD * 100 ? POS : NEG} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

export function ActivityChart({ records }: { records: PredictionRecord[] }) {
  const data = useMemo(() => {
    const days = 14
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (days - 1 - i))
      return {
        key: d.toDateString(),
        day: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        Readmission: 0,
        'No readmission': 0,
      }
    })
    const index = new Map(buckets.map((b) => [b.key, b]))
    for (const r of records) {
      const d = new Date(r.createdAt)
      d.setHours(0, 0, 0, 0)
      const b = index.get(d.toDateString())
      if (!b) continue
      if (isReadmitted(r.result.prediction_label)) b.Readmission++
      else b['No readmission']++
    }
    return buckets
  }, [records])

  return (
    <Panel title="Recent activity" description="Predictions per day, last 14 days.">
      <div className="h-64" role="img" aria-label="Stacked bar chart of predictions per day over the last 14 days">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
            <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
            <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={LegendText} />
            <Bar dataKey="No readmission" stackId="a" fill={NEG} />
            <Bar dataKey="Readmission" stackId="a" fill={POS} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
