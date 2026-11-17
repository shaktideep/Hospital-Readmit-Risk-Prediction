import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn('size-8', className)}>
      <path d="M3 30V15a13 13 0 0 1 26 0v15H3Z" className="fill-primary/12 stroke-primary/50" strokeWidth="1" />
      <path
        d="M16 25s-6.5-3.9-6.5-8.6A3.6 3.6 0 0 1 16 14.2a3.6 3.6 0 0 1 6.5 2.2C22.5 21.1 16 25 16 25Z"
        className="stroke-primary"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11 18.2h2.4l1.2-2.2 2 4 1.3-1.8h3.1"
        className="stroke-primary"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="7.5" r="1.5" className="fill-chart-2" />
      <circle cx="10.5" cy="9.5" r="0.9" className="fill-chart-2/70" />
      <circle cx="21.5" cy="9.5" r="0.9" className="fill-chart-2/70" />
    </svg>
  )
}

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="shrink-0" />
      {!collapsed && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold tracking-tight">CareSense</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            AI Clinical Intelligence
          </span>
        </span>
      )}
    </span>
  )
}
