import { Link, useLocation, Outlet } from 'react-router-dom'
import { LayoutDashboard, Building2, MapPin, Scissors, Users, CalendarDays, Settings, LogOut, Search, Menu, X, ChevronDown, Plus, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/app/providers/auth'
import { useSession } from '@/app/providers/session'
import { useWorkspace } from '@/app/providers/workspace'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { locationsApi } from '@/services/api/locations'
import { ThemeSwitch } from '@/components/ui/theme-switch'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import type { SessionMode } from '@/types/session'

const MODE_SHORT: Record<SessionMode, string> = { OWNER: 'Gestão', PROFESSIONAL: 'Profissional', CUSTOMER: 'Cliente' }

function ModeSwitcher() {
  const { session } = useSession()
  const { activeMode, switchMode } = useWorkspace()
  const modes = session?.availableModes ?? []
  if (modes.length < 2) return null
  return (
    <div className="mx-3 mt-2">
      <label htmlFor="mode-switch" className="sr-only">
        Modo de atuação
      </label>
      <select
        id="mode-switch"
        value={activeMode ?? ''}
        onChange={(e) => switchMode(e.target.value as SessionMode)}
        className="w-full rounded-lg border border-border bg-muted px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
      >
        {modes.map((m) => (
          <option key={m} value={m}>
            Modo: {MODE_SHORT[m]}
          </option>
        ))}
      </select>
    </div>
  )
}

function LocationSwitcher() {
  const queryClient = useQueryClient()
  const { activeMembership, activeLocationId, switchLocation } = useWorkspace()
  const { businessId } = useActiveBusiness()
  const { data: locations = [] } = useQuery({
    queryKey: ['locations', 'switcher', businessId],
    queryFn: () => locationsApi.list(businessId!),
    enabled: !!businessId && !!activeMembership && activeMembership.locationIds.length > 1,
  })
  const locIds = activeMembership?.locationIds ?? []
  if (!activeMembership || locIds.length < 2) return null
  const options = locations.filter((l) => locIds.includes(l.id))
  return (
    <div className="mx-3 mt-2">
      <label htmlFor="location-switch" className="sr-only">
        Local de atuação
      </label>
      <select
        id="location-switch"
        value={activeLocationId ?? ''}
        onChange={(e) => {
          switchLocation(e.target.value)
          void queryClient.invalidateQueries()
        }}
        className="w-full rounded-lg border border-border bg-muted px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
      >
        <option value="">Todos os locais</option>
        {options.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function DashboardLayout() {
  return <DashboardLayoutInner />
}

function BusinessSwitcher() {
  const [open, setOpen] = useState(false)
  const { activeBusiness, businessesForMode, switchBusiness, activeMode } = useWorkspace()
  // Somente businesses compatíveis com o modo ativo (contrato /me/session); troca sem logout.
  const businesses = businessesForMode
  const business = activeBusiness

  const switchTo = (id: string) => {
    switchBusiness(id)
    setOpen(false)
  }

  if (activeMode === 'CUSTOMER') return null

  return (
    <div className="relative mx-3 mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted px-2.5 py-2 text-left"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-primary-500" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
          {business?.name || 'Nenhum negócio'}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-surface py-1 shadow-lg">
          {businesses.length === 0 ? (
            <Link
              to="/businesses/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-primary-soft-fg hover:bg-primary-soft"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar negócio
            </Link>
          ) : (
            businesses.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => switchTo(b.id)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-xs',
                  b.id === business?.id
                    ? 'bg-primary-soft font-semibold text-primary-soft-fg'
                    : 'text-muted-foreground hover:bg-primary-soft'
                )}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span className="flex-1 truncate text-left">{b.name}</span>
                {b.id === business?.id && (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function DashboardLayoutInner() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/businesses', label: 'Negócios', icon: Building2 },
    { to: '/locations', label: 'Locais', icon: MapPin },
    { to: '/services', label: 'Serviços', icon: Scissors },
    { to: '/staff', label: 'Equipe', icon: Users },
    { to: '/appointments', label: 'Agendamentos', icon: CalendarDays },
  ]

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
          'fixed inset-y-0 left-0 z-50 w-60 flex-shrink-0 border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              A
            </div>
            <span className="text-base font-bold tracking-tight text-foreground font-display">
              Agendaqui
            </span>
          </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden btn-ghost !p-1"
              aria-label="Fechar menu de navegação"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>

        {/* Search */}
        <div className="relative mx-3 mt-3">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full rounded-lg border border-border bg-muted py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>

        {/* Active business */}
        <ModeSwitcher />
        <BusinessSwitcher />
        <LocationSwitcher />

        {/* Navigation */}
        <nav className="mt-4 flex-1 space-y-0.5 px-2.5">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(item.to + '/')

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-soft text-primary-soft-fg font-semibold'
                    : 'text-muted-foreground hover:bg-primary-soft hover:text-primary-soft-fg'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2.5">
          <div className="mb-2 px-1">
            <ThemeSwitch />
          </div>
          <Link
            to="/settings"
            className="sidebar-item"
            onClick={() => setSidebarOpen(false)}
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Link>

          <div className="mt-2 flex items-center gap-2.5 rounded-lg px-2.5 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-soft-fg">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-destructive-soft hover:text-destructive-soft-fg"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b border-border bg-surface px-4 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="btn-ghost !p-1.5"
              aria-label="Abrir menu de navegação"
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          <div className="ml-2.5 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              A
            </div>
            <span className="text-sm font-bold text-foreground font-display">Agendaqui</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
