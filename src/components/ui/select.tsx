import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean | string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, placeholder, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={cn(
            'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground transition-colors duration-150',
            'hover:border-warm-300',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
            'disabled:opacity-50 disabled:bg-warm-50 disabled:cursor-not-allowed',
            error ? 'border-destructive focus:border-destructive focus:ring-destructive/10' : 'border-warm-200',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && typeof error === 'string' && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
