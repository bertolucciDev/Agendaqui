import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/app/providers/theme'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
] as const

export function ThemeSwitch({ showLabel }: { showLabel?: boolean } = {}) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      className="flex items-center gap-0.5 rounded-lg border border-border bg-transparent p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={`Tema: ${label}`}
          onClick={() => setTheme(value)}
          className={cn(
            'flex items-center justify-center rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1',
            theme === value
              ? 'bg-muted text-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className={showLabel ? 'ml-1.5' : 'hidden'}>{label}</span>
        </button>
      ))}
    </div>
  )
}
