import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean | string
  options: { value: string; label: string }[]
  placeholder?: string
  label?: string
  hint?: string
  required?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, placeholder, label, hint, id, required, ...props }, ref) => {
    const generatedId = useId()
    const selectId = id ?? generatedId
    const errorId = `${selectId}-error`
    const hintId = `${selectId}-hint`
    const hasError = Boolean(error)
    const messageId = hasError ? errorId : hint && !error ? hintId : undefined

    return (
      <div className="w-full">
        {label && (
          <label className="label" htmlFor={selectId}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={hasError || undefined}
          aria-describedby={messageId}
          aria-required={required || undefined}
          required={required}
          className={cn(
            'block w-full rounded-lg border bg-input-bg px-3 py-2 text-sm text-foreground transition-colors duration-150',
            'hover:border-border-strong',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
            'disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed',
            hasError
              ? 'border-destructive focus:border-destructive focus:ring-destructive/10'
              : 'border-border',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hint && !hasError && (
          <p id={hintId} className="mt-1 text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {hasError && typeof error === 'string' && (
          <p id={errorId} className="mt-1 text-xs text-destructive-soft-fg" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'
