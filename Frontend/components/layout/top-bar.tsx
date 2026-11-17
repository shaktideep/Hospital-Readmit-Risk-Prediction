'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, FlaskConical, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { HEALTH_COPY, useHealth } from '@/hooks/use-health'
import { setDemoMode, useDemoMode } from '@/hooks/use-demo-mode'
import { cn } from '@/lib/utils'
import { Logo } from './logo'
import { NavLinks } from './sidebar-nav'
import { findNavItem } from './nav-items'
import { StatusDot } from './status-dot'
import { ThemeToggle } from './theme-toggle'

function ApiIndicator() {
  const { state } = useHealth()
  return (
    <Link
      href="/model-status"
      className="flex h-8 items-center gap-2 rounded-full border bg-card px-3 text-xs font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      title={HEALTH_COPY[state].description}
    >
      <StatusDot state={state} />
      <span className="hidden sm:inline">{HEALTH_COPY[state].label}</span>
      <span className="sr-only sm:hidden">{`API status: ${HEALTH_COPY[state].label}`}</span>
    </Link>
  )
}

function DemoToggle() {
  const demo = useDemoMode()
  return (
    <Button
      variant={demo ? 'secondary' : 'ghost'}
      size="sm"
      onClick={() => setDemoMode(!demo)}
      aria-pressed={demo}
      className={cn(demo && 'bg-warning/15 text-warning hover:bg-warning/25')}
    >
      <FlaskConical />
      <span className="hidden md:inline">{demo ? 'Demo mode on' : 'Demo mode'}</span>
    </Button>
  )
}

export function TopBar() {
  const pathname = usePathname()
  const item = findNavItem(pathname)
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md sm:px-6 print:hidden">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle>
              <Logo />
            </SheetTitle>
            <SheetDescription className="sr-only">Main navigation</SheetDescription>
          </SheetHeader>
          <nav aria-label="Mobile" className="p-3">
            <NavLinks onNavigate={() => setOpen(false)} />
          </nav>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <nav aria-label="Breadcrumb" className="hidden sm:block">
          <ol className="flex items-center gap-1 text-xs text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">CareSense</Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3" />
            </li>
            <li aria-current="page" className="truncate">{item.label}</li>
          </ol>
        </nav>
        <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{item.label}</h1>
      </div>

      <div className="flex items-center gap-1.5">
        <ApiIndicator />
        <DemoToggle />
        <ThemeToggle />
      </div>
    </header>
  )
}
