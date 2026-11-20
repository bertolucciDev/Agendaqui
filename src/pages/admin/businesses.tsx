import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/services/api/admin'
import type { AdminBusinessListItem } from '@/types/admin'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import {
  Search,
  Store,
  Users,
  MapPin,
  Wrench,
  Building2,
  RefreshCw,
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  PENDING: { label: 'Pendente', variant: 'warning' },
  ACTIVE: { label: 'Ativo', variant: 'success' },
  BLOCKED: { label: 'Bloqueado', variant: 'destructive' },
}

function BadgeStatus({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'secondary' }
  const variantStyles: Record<string, string> = {
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    destructive: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    secondary: 'bg-muted text-muted-foreground border-border',
  }

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', variantStyles[config.variant] ?? variantStyles.secondary)}>
      {config.label}
    </span>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function BusinessRow({ item }: { item: AdminBusinessListItem }) {
  return (
    <Link
      to={`/admin/businesses/${item.id}`}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary-accent hover:shadow-sm sm:flex-row sm:items-center sm:gap-4"
    >
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-fg">
        <Store className="h-5 w-5" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
          <BadgeStatus status={item.status} />
          <span className="text-xs text-muted-foreground capitalize">
            {item.type === 'COMPANY' ? 'PJ' : 'PF'}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground truncate">{item.document}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {item.ownerName}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {item.locationCount} local(is)
          </span>
          <span className="flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            {item.serviceCount} servico(s)
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {item.categoryName || '—'}
          </span>
        </div>
      </div>

      {/* Date */}
      <div className="text-right text-xs text-muted-foreground sm:min-w-[120px]">
        {formatDate(item.createdAt)}
      </div>

      {/* Arrow */}
      <svg className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

export default function AdminBusinessesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'businesses', statusFilter, search],
    queryFn: () =>
      adminApi.listAllBusinesses({
        status: statusFilter || undefined,
        search: search || undefined,
        limit: 20,
      }),
  })

  const items = data?.data ?? []

  return (
    <div>
      <PageHeader>
        <div className="flex items-center justify-between">
          <PageTitle>Negócios</PageTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, documento, slug ou proprietário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-accent"
          >
            <option value="">Todos os status</option>
            <option value="PENDING">Pendente</option>
            <option value="ACTIVE">Ativo</option>
            <option value="BLOCKED">Bloqueado</option>
          </select>
        </div>

        {/* Summary */}
        {!isLoading && (
          <p className="mb-4 text-sm text-muted-foreground">
            {data?.total ?? 0} negocio(s) encontrado(s)
          </p>
        )}

        {/* List */}
        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Store className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum negocio encontrado.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <BusinessRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </PageContent>
    </div>
  )
}
