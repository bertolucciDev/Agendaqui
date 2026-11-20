import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean
  hint?: string
  label?: string
  /** Rótulo obrigatório (visível ou via sr-only) — marca o campo como obrigatório para leitores de tela. */
  required?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, hint, label, id, required, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`
    const hintId = `${inputId}-hint`
    const hasError = Boolean(error)
    const messageId = hasError ? errorId : hint && !error ? hintId : undefined

    return (
      <div className="w-full">
        {label && (
          <label className="label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={hasError || undefined}
          aria-describedby={messageId}
          aria-required={required || undefined}
          required={required}
          className={cn(
            'block w-full rounded-lg border bg-input-bg px-3 py-2 text-sm text-foreground transition-colors duration-150',
            'placeholder:text-muted-foreground',
            'hover:border-border-strong',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
            'disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed',
            hasError
              ? 'border-destructive focus:border-destructive focus:ring-destructive/10'
              : 'border-border',
            className
          )}
          {...props}
        />
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
Input.displayName = 'Input'
