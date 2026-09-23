import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'neutral'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-green-700',
  warning: 'bg-warning-50 text-amber-700',
  destructive: 'bg-destructive-50 text-red-700',
  info: 'bg-info-50 text-blue-700',
  neutral: 'bg-warm-100 text-warm-600',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'
