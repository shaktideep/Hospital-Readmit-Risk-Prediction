'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchableSelectProps {
  id: string
  value: string
  options: string[]
  onValueChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  describedBy?: string
  emptyLabel?: string
  name?: string
}

export function SearchableSelect({
  id,
  value,
  options,
  onValueChange,
  onBlur,
  placeholder,
  disabled,
  invalid,
  required,
  describedBy,
  emptyLabel = 'No matching option',
  name,
}: SearchableSelectProps) {
  return (
    <ComboboxPrimitive.Root
      items={options}
      value={value || null}
      onValueChange={(next) => onValueChange(typeof next === 'string' ? next : '')}
      disabled={disabled}
      name={name}
      autoHighlight
    >
      <div className="relative">
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          onBlur={onBlur}
          className="h-10 w-full min-w-0 truncate rounded-lg border border-input bg-transparent pr-9 pl-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
        />
        <ComboboxPrimitive.Trigger
          aria-label="Show options"
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground disabled:pointer-events-none"
        >
          <ChevronsUpDown className="size-4" aria-hidden="true" />
        </ComboboxPrimitive.Trigger>
      </div>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner sideOffset={6} className="z-50 outline-none">
          <ComboboxPrimitive.Popup className="w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg outline-none transition-[opacity,scale] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <ComboboxPrimitive.Empty className="px-3 py-3 text-sm text-muted-foreground empty:hidden">
              {emptyLabel}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 outline-none">
              {(item: string) => (
                <ComboboxPrimitive.Item
                  key={item}
                  value={item}
                  className={cn(
                    'flex cursor-default items-center gap-2 rounded-md px-2 py-2 text-sm outline-none select-none',
                    'data-[highlighted]:bg-muted data-[highlighted]:text-foreground',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{item}</span>
                  <ComboboxPrimitive.ItemIndicator>
                    <Check className="size-4 text-primary" aria-hidden="true" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  )
}
