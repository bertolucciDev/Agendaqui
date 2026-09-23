import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color: 'primary' | 'success' | 'accent' | 'warning'
}

const colorMap = {
  primary: { bg: 'bg-primary-50', icon: 'text-primary-500' },
  success: { bg: 'bg-success-50', icon: 'text-green-500' },
  accent: { bg: 'bg-accent', icon: 'text-accent-500' },
  warning: { bg: 'bg-warning-50', icon: 'text-amber-500' },
}

const trendConfig = {
  up: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-success-50' },
  down: { icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive-50' },
  neutral: { icon: Minus, color: 'text-ink-faint', bg: 'bg-warm-100' },
}

export function StatCard({ icon: Icon, label, value, trend = 'neutral', trendValue, color }: StatCardProps) {
  const colors = colorMap[color]
  const trendInfo = trendConfig[trend]
  const TrendIcon = trendInfo.icon

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', colors.bg)}>
          <Icon className={cn('h-5 w-5', colors.icon)} />
        </div>
        {trendValue && (
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', trendInfo.bg, trendInfo.color)}>
            <TrendIcon className="h-3 w-3" />
            {trendValue}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
    </div>
  )
}
