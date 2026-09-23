import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name?: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-2xl',
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name, src, size = 'md', ...props }, ref) => {
    const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

    if (src) {
      return (
        <div
          ref={ref}
          className={cn('relative shrink-0 overflow-hidden rounded-full', sizeClasses[size], className)}
          {...props}
        >
          <img src={src} alt={name || ''} className="h-full w-full object-cover" />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {initials}
      </div>
    )
  }
)
Avatar.displayName = 'Avatar'
