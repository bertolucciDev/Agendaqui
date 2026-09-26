import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean
  hint?: string
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, hint, label, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="label">{label}</label>}
        <input
          ref={ref}
          className={cn(
            'block w-full rounded-lg border bg-input-bg px-3 py-2 text-sm text-foreground transition-colors duration-150',
            'placeholder:text-muted-foreground',
            'hover:border-border-strong',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
            'disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed',
            error ? 'border-destructive focus:border-destructive focus:ring-destructive/10' : 'border-border',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        {error && typeof error === 'string' && <p className="mt-1 text-xs text-destructive-soft-fg">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
