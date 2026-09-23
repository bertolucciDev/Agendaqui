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
            'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground transition-colors duration-150',
            'placeholder:text-ink-faint',
            'hover:border-warm-300',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
            'disabled:opacity-50 disabled:bg-warm-50 disabled:cursor-not-allowed',
            error ? 'border-destructive focus:border-destructive focus:ring-destructive/10' : 'border-warm-200',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
        {error && typeof error === 'string' && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
