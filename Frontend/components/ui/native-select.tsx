'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NativeSelectProps {
  id: string
  name: string
  value: string
  options: string[]
  placeholder: string
  onValueChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  describedBy?: string
}

export function NativeSelect({
  id,
  name,
  value,
  options,
  placeholder,
  onValueChange,
  onBlur,
  disabled,
  invalid,
  required,
  describedBy,
}: NativeSelectProps) {
  const known = value === '' || options.includes(value)
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          'h-10 w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg border border-input bg-transparent pr-9 pl-2.5 text-base transition-colors outline-none md:text-sm',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
          'dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
          value === '' && 'text-muted-foreground',
        )}
      >
        <option value="" disabled className="text-muted-foreground">
          {placeholder}
        </option>
        {!known ? <option value={value}>{value}</option> : null}
        {options.map((option) => (
          <option key={option} value={option} className="bg-popover text-popover-foreground">
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  )
}
