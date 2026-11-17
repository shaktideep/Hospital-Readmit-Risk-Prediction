'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { DECISION_THRESHOLD, formatProbability } from '@/lib/format'

const SIZE = 220
const STROKE = 14
const R = (SIZE - STROKE) / 2 - 6
const C = 2 * Math.PI * R

export function ProbabilityRing({
  probability,
  positive,
  size = SIZE,
  className,
}: {
  probability: number
  positive: boolean
  size?: number
  className?: string
}) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(probability))
    return () => cancelAnimationFrame(id)
  }, [probability])

  const offset = C * (1 - shown)
  const thresholdAngle = DECISION_THRESHOLD * 360 - 90
  const tx = SIZE / 2 + (R + STROKE / 2 + 4) * Math.cos((thresholdAngle * Math.PI) / 180)
  const ty = SIZE / 2 + (R + STROKE / 2 + 4) * Math.sin((thresholdAngle * Math.PI) / 180)
  const tx2 = SIZE / 2 + (R - STROKE / 2 - 4) * Math.cos((thresholdAngle * Math.PI) / 180)
  const ty2 = SIZE / 2 + (R - STROKE / 2 - 4) * Math.sin((thresholdAngle * Math.PI) / 180)

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" aria-hidden="true">
        <defs>
          <linearGradient id="cs-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" />
            <stop offset="100%" stopColor={positive ? 'var(--chart-5)' : 'var(--chart-1)'} />
          </linearGradient>
        </defs>
        {Array.from({ length: 40 }).map((_, i) => {
          const a = (i / 40) * 2 * Math.PI - Math.PI / 2
          const r1 = R + STROKE / 2 + 10
          const r2 = r1 + (i % 5 === 0 ? 5 : 2.5)
          return (
            <line
              key={i}
              x1={SIZE / 2 + r1 * Math.cos(a)}
              y1={SIZE / 2 + r1 * Math.sin(a)}
              x2={SIZE / 2 + r2 * Math.cos(a)}
              y2={SIZE / 2 + r2 * Math.sin(a)}
              className="stroke-muted-foreground/30"
              strokeWidth={1}
            />
          )
        })}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" className="stroke-muted" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="url(#cs-ring)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
        <line x1={tx} y1={ty} x2={tx2} y2={ty2} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tracking-tight tabular sm:text-[44px]">{formatProbability(probability)}</span>
        <span className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">probability</span>
      </div>
    </div>
  )
}
