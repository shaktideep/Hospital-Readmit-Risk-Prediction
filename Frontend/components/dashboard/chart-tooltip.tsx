'use client'

interface TooltipEntry {
  name?: string | number
  value?: number | string
  color?: string
  payload?: { fill?: string }
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  formatter?: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label !== undefined && label !== '' && <p className="mb-1 font-medium">{label}</p>}
      <ul className="flex flex-col gap-1">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="size-2 rounded-sm" style={{ background: p.color ?? p.payload?.fill }} aria-hidden="true" />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto pl-3 font-mono font-medium tabular">
              {formatter && typeof p.value === 'number' ? formatter(p.value) : p.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
