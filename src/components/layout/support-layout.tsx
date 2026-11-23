import { ClipboardCheck, LifeBuoy, LogOut, Settings, UsersRound } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/auth'
import { ThemeSwitch } from '@/components/ui/theme-switch'
import { cn } from '@/lib/utils'
import { SupportNotificationBell } from '@/components/support/support-notification-bell'
import { AgendaquiMark } from '@/components/shared/agendaqui-mark'

export default function SupportLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex h-screen w-16 shrink-0 flex-col border-r border-border bg-surface sm:w-64">
        <div className="flex h-20 items-center justify-center gap-3 border-b border-border px-2 sm:justify-start sm:px-6">
          <AgendaquiMark className="h-10 w-10 rounded-xl" />
          <div className="hidden sm:block">
            <Link to="/support" className="font-display text-base font-bold text-foreground">
              Agendaqui
            </Link>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Suporte
            </p>
          </div>
        </div>

        <nav aria-label="Menu de suporte" className="flex-1 px-2 py-8 sm:px-4">
          <NavLink
            to="/support"
            end
            className={({ isActive }) => cn(
              'flex items-center justify-center gap-3 rounded-xl px-2 py-3 text-sm font-medium sm:justify-start sm:px-4',
              isActive
                ? 'bg-primary-soft text-primary-soft-fg'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <LifeBuoy className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only">Central de atendimento</span>
          </NavLink>
          <NavLink
            to="/support/accounts"
            className={({ isActive }) => cn(
              'mt-2 flex items-center justify-center gap-3 rounded-xl px-2 py-3 text-sm font-medium sm:justify-start sm:px-4',
              isActive
                ? 'bg-primary-soft text-primary-soft-fg'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <UsersRound className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only">Contas</span>
          </NavLink>
          <NavLink
            to="/support/verifications"
            className={({ isActive }) => cn(
              'mt-2 flex items-center justify-center gap-3 rounded-xl px-2 py-3 text-sm font-medium sm:justify-start sm:px-4',
              isActive
                ? 'bg-primary-soft text-primary-soft-fg'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <ClipboardCheck className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only">Verificação de negócios</span>
          </NavLink>
          <NavLink
            to="/support/settings"
            className={({ isActive }) => cn(
              'mt-2 flex items-center justify-center gap-3 rounded-xl px-2 py-3 text-sm font-medium sm:justify-start sm:px-4',
              isActive
                ? 'bg-primary-soft text-primary-soft-fg'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only">Configurações</span>
          </NavLink>
        </nav>

        <div className="space-y-3 border-t border-border p-2 sm:p-4">
          <div className="hidden rounded-xl border border-border/70 bg-background/50 p-3 sm:block">
            <ThemeSwitch />
          </div>
          <div className="flex items-center justify-center gap-3 rounded-xl bg-muted/40 p-2 sm:justify-start sm:p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-soft-fg">
              {user?.name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div className="hidden min-w-0 flex-1 sm:block">
              <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Suporte</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            aria-label="Sair da conta"
            className="flex w-full items-center justify-center gap-3 rounded-xl px-2 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive-soft-fg sm:justify-start sm:px-4"
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only">Sair da conta</span>
          </button>
        </div>
      </aside>

      <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="pointer-events-none absolute right-5 top-2 z-30">
          <div className="pointer-events-auto">
            <SupportNotificationBell />
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
