import { cn } from '@/lib/utils'

const PETAL_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30)

export function Mandala({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" className={cn('text-primary', className)}>
      <g stroke="currentColor" strokeWidth="1">
        {PETAL_ANGLES.map((angle) => (
          <ellipse key={angle} cx="60" cy="30" rx="7" ry="22" transform={`rotate(${angle} 60 60)`} />
        ))}
        <circle cx="60" cy="60" r="10" />
        <circle cx="60" cy="60" r="52" strokeDasharray="2 4" />
        <circle cx="60" cy="60" r="58" />
      </g>
    </svg>
  )
}
