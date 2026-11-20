
import { Link, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardCheck,
  Tag,
  SlidersHorizontal,
  LogOut,
  Menu,
  X,
  Shield,
  Store,
  LockKeyhole,
} from 'lucide-react'
import { useAuth } from '@/app/providers/auth'
import { ThemeSwitch } from '@/components/ui/theme-switch'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/verifications', label: 'Verificações', icon: ClipboardCheck },
  { to: '/admin/businesses', label: 'Negócios', icon: Store },
  { to: '/admin/categories', label: 'Categorias', icon: Tag },
  { to: '/admin/config', label: 'Configurações', icon: SlidersHorizontal },
  { to: '/admin/privacy-requests', label: 'Privacidade', icon: LockKeyhole },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-screen bg-background">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[var(--overlay-scrim)] backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >

        {/* Logo */}
        <div className="flex h-20 shrink-0 items-center border-b border-border px-6">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>

            <div className="flex flex-col">
              <span className="font-display text-base font-bold tracking-tight text-foreground">
                Agendaqui
              </span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Administração
              </span>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-8">

          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
            Menu principal
          </p>

          {NAV_ITEMS.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname === item.to ||
                location.pathname.startsWith(item.to + '/')

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl border-l-[3px] px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-l-primary-accent bg-primary-soft text-primary-soft-fg font-semibold'
                    : 'border-l-transparent text-muted-foreground hover:bg-primary-soft/70 hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-border p-4">

          {/* Theme */}
          <div className="mb-4 rounded-xl border border-border/70 bg-background/50 p-3">
            <ThemeSwitch />
          </div>

          {/* User */}
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-muted/40 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive-soft text-sm font-bold text-destructive-soft-fg">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {user?.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Super Admin
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive-soft hover:text-destructive-soft-fg"
          >
            <LogOut className="h-5 w-5" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Mobile header */}
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-surface px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Abrir menu"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="ml-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive text-white">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-display text-sm font-bold text-foreground">
              Painel Admin
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
