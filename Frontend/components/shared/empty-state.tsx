import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden="true" />
      <div className="relative flex size-11 items-center justify-center rounded-xl border bg-card text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="relative mt-4 text-sm font-semibold">{title}</h3>
      <p className="relative mt-1 max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>
      {children && <div className="relative mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}
