import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  children: ReactNode
  className?: string
}

export function PageHeader({ children, className }: PageHeaderProps) {
  return (
    <header className={cn('flex h-14 items-center justify-between border-b border-warm-200 bg-white px-5', className)}>
      {children}
    </header>
  )
}

interface PageTitleProps {
  children: ReactNode
  className?: string
}

export function PageTitle({ children, className }: PageTitleProps) {
  return (
    <h1 className={cn('text-lg font-bold text-foreground font-display', className)}>
      {children}
    </h1>
  )
}

interface PageContentProps {
  children: ReactNode
  className?: string
}

export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn('p-5', className)}>
      {children}
    </div>
  )
}
