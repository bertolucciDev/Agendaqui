import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warm-100">
          <Icon className="h-6 w-6 text-ink-faint" />
        </div>
      )}
      <h3 className="mt-4 text-base font-semibold text-foreground font-display">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
