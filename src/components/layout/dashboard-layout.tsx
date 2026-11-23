import { Link, useLocation, Outlet } from 'react-router-dom'
import { LayoutDashboard, Building2, MapPin, Scissors, Users, CalendarDays, Settings, LogOut, Menu, X, ChevronDown, Plus, CheckCircle2, LifeBuoy, ShoppingCart, Package } from 'lucide-react'
import { useAuth } from '@/app/providers/auth'
import { useSession } from '@/app/providers/session'
import { useWorkspace } from '@/app/providers/workspace'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { locationsApi } from '@/services/api/locations'
import { businessesApi } from '@/services/api/businesses'
import { posApi } from '@/services/api/pos'
import { ThemeSwitch } from '@/components/ui/theme-switch'
import { GlobalSearch } from '@/components/layout/global-search'
import { NotificationBell } from '@/components/layout/notification-bell'
import { AgendaquiMark } from '@/components/shared/agendaqui-mark'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import type { SessionMode } from '@/types/session'
import { usePendingBusinessVerification } from '@/hooks/use-business-verification'

const MODE_SHORT: Record<SessionMode, string> = { OWNER: 'Gestão', PROFESSIONAL: 'Profissional', CUSTOMER: 'Cliente' }

function ModeSwitcher() {
  const { session } = useSession()
  const { activeMode, switchMode } = useWorkspace()
  // MVP administrativo: CUSTOMER permanece no contrato, mas fora da superfície do MVP.
  const modes = (session?.availableModes ?? []).filter((m) => m !== 'CUSTOMER')
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
  const pendingVerification = usePendingBusinessVerification()

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
          {pendingVerification ? (
            <button
              type="button"
              disabled
              aria-label={`${pendingVerification.tradeName ?? 'Novo negócio'}, pendente de aprovação`}
              className="flex w-full cursor-not-allowed items-center gap-2 px-3 py-2 text-xs opacity-50"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="flex-1 truncate text-left">
                {pendingVerification.tradeName ?? 'Novo negócio'}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Pendente
              </span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

function DashboardLayoutInner() {
  const { user, logout } = useAuth()
  const { activeMode, activeMembership, activeBusiness, activeLocationId } = useWorkspace()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const isCompactWorkspace = activeMode === 'PROFESSIONAL' || activeMembership?.role === 'MANAGER'
  const canUsePos = activeMode === 'PROFESSIONAL' || activeMembership?.role === 'MANAGER'

  const posBusinessQuery = useQuery({
    queryKey: ['business-profile', activeBusiness?.id],
    queryFn: () => businessesApi.getBySlug(activeBusiness!.id),
    enabled: canUsePos && !!activeBusiness?.id,
  })
  const posCatalogQuery = useQuery({
    queryKey: ['pos-catalog', activeBusiness?.id, activeLocationId],
    queryFn: () => posApi.getCatalog(activeBusiness!.id, activeLocationId!),
    enabled: canUsePos && !!activeBusiness?.id && !!activeLocationId && posBusinessQuery.data?.sellsProducts === true,
  })
  const showPos = posCatalogQuery.data?.some((product) => product.active) ?? false

  const navItems = activeMode === 'PROFESSIONAL'
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/appointments', label: 'Agendamentos', icon: CalendarDays },
        ...(showPos ? [{ to: '/pos', label: 'PDV', icon: ShoppingCart }] : []),
      ]
    : activeMembership?.role === 'MANAGER'
      ? [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/appointments', label: 'Agendamentos', icon: CalendarDays },
          { to: '/staff', label: 'Equipe', icon: Users },
          { to: '/services', label: 'Serviços', icon: Scissors },
          ...(showPos ? [{ to: '/pos', label: 'PDV', icon: ShoppingCart }] : []),
        ]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/businesses', label: 'Negócios', icon: Building2 },
        { to: '/locations', label: 'Locais', icon: MapPin },
        { to: '/products', label: 'Produtos', icon: Package },
        { to: '/services', label: 'Serviços', icon: Scissors },
        { to: '/staff', label: 'Equipe', icon: Users },
        { to: '/appointments', label: 'Agendamentos', icon: CalendarDays },
        { to: '/help', label: 'Ajuda e suporte', icon: LifeBuoy },
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
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <AgendaquiMark className="h-8 w-8 rounded-lg" />
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

        {/* Busca global (⌘K) */}
        {activeMode !== 'PROFESSIONAL' && activeMembership?.role !== 'MANAGER' && <GlobalSearch />}

        {/* Active business */}
        <ModeSwitcher />
        <BusinessSwitcher />
        <LocationSwitcher />

        {/* Navigation */}
        <nav className={cn('mt-4 flex-1 px-2.5', isCompactWorkspace ? 'space-y-3' : 'space-y-0.5')}>
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
                  'flex items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-all duration-150 border-l-2 border-transparent',
                  isCompactWorkspace ? 'py-3' : 'py-2',
                  isActive
                    ? 'bg-primary-soft text-primary-soft-fg font-semibold border-l-primary-accent'
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
        <div className={cn('border-t border-border p-2.5', isCompactWorkspace && 'space-y-3 p-3')}>
          <div className={cn('px-1', isCompactWorkspace ? 'mb-4' : 'mb-2')}>
            <ThemeSwitch />
          </div>
          <Link
            to="/settings"
            className={cn('sidebar-item', isCompactWorkspace && 'my-1 py-2.5')}
            onClick={() => setSidebarOpen(false)}
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Link>

          <div className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2', isCompactWorkspace ? 'mt-4' : 'mt-2')}>
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
            className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-destructive-soft hover:text-destructive-soft-fg', isCompactWorkspace && 'py-2.5')}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Global header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="btn-ghost !p-1.5 lg:hidden"
              aria-label="Abrir menu de navegação"
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          <div className="ml-2.5 flex items-center gap-2">
            <AgendaquiMark className="h-7 w-7 rounded-lg" />
            <span className="text-sm font-bold text-foreground font-display">Agendaqui</span>
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
