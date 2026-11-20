
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'

import { adminApi } from '@/services/api/admin'
import type { AdminVerificationSummary } from '@/types/admin'

import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Ban,
  RefreshCw,
  ClipboardCheck,
  ArrowRight,
  X,
} from 'lucide-react'

const STATUS_CONFIG: Record<
  string,
  {
    label: string
    variant: string
    icon: React.ReactNode
  }
> = {
  PENDING: {
    label: 'Pendente',
    variant: 'warning',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  APPROVED: {
    label: 'Aprovado',
    variant: 'success',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  REJECTED: {
    label: 'Rejeitado',
    variant: 'destructive',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  DRAFT: {
    label: 'Rascunho',
    variant: 'secondary',
    icon: <FileText className="h-3.5 w-3.5" />,
  },
  CANCELLED: {
    label: 'Cancelado',
    variant: 'outline',
    icon: <Ban className="h-3.5 w-3.5" />,
  },
  EXPIRED: {
    label: 'Expirado',
    variant: 'outline',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  BLOCKED: {
    label: 'Bloqueado',
    variant: 'destructive',
    icon: <Ban className="h-3.5 w-3.5" />,
  },
}

const STATUS_STYLES: Record<string, string> = {
  warning:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  success:
    'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400',
  destructive:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400',
  secondary:
    'border-border bg-muted text-muted-foreground',
  outline:
    'border-border text-muted-foreground',
}

function BadgeStatus({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        STATUS_STYLES[config.variant]
      )}
    >
      {config.icon}
      {config.label}
    </span>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return '—'

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function VerificationCard({
  item,
}: {
  item: AdminVerificationSummary
}) {
  const docsCount = item.documents?.length ?? 0

  return (
    <Link
      to={`/admin/verifications/${item.verificationId}`}
      className="group block rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:border-primary-accent hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {item.tradeName || item.legalName || 'Sem nome'}
            </h3>

            <BadgeStatus status={item.status} />
          </div>

          <p className="mt-2 truncate text-sm text-muted-foreground">
            {item.document}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" />
              {item.businessType === 'COMPANY'
                ? 'Pessoa Jurídica'
                : 'Pessoa Física'}
            </span>

            <span>
              Tentativa {item.attemptCount}/3
            </span>

            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {docsCount} documento(s)
            </span>
          </div>

          {item.submittedAt && (
            <p className="mt-3 text-xs text-muted-foreground">
              Enviado em {formatDate(item.submittedAt)}
            </p>
          )}
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-all group-hover:bg-primary-soft group-hover:text-primary">
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  )
}

function VerificationSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-32 rounded-xl"
        />
      ))}
    </div>
  )
}

export default function AdminVerificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')

  const statusFilter = searchParams.get('status') || ''

  // Consulta de verificações
  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'verifications', statusFilter],
    queryFn: () =>
      adminApi.listVerifications(
        statusFilter
          ? { status: statusFilter }
          : undefined
      ),
  })

  const items = data?.data ?? []

  // Filtro de busca local
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return items

    return items.filter((item) => {
      return [
        item.tradeName,
        item.legalName,
        item.document,
        item.ownerName,
      ].some((value) =>
        value?.toLowerCase().includes(query)
      )
    })
  }, [items, search])

  // Alteração do filtro de status
  const handleStatusChange = (value: string) => {
    setSearchParams(
      (currentParams) => {
        const params = new URLSearchParams(currentParams)

        if (value) {
          params.set('status', value)
        } else {
          params.delete('status')
        }

        return params
      },
      { replace: true }
    )
  }

  // Limpar filtros
  const clearFilters = () => {
    setSearch('')
    handleStatusChange('')
  }

  const hasFilters = Boolean(search.trim() || statusFilter)

  return (
    <div>
      <PageHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <PageTitle>
              Verificações de Negócio
            </PageTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie e acompanhe as solicitações de verificação.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Atualizar verificações"
          >
            <RefreshCw
              className={cn(
                'h-4 w-4',
                isFetching && 'animate-spin'
              )}
            />
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        {/* Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                placeholder="Buscar por nome, documento ou proprietário..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                className="h-10 pl-9 pr-9"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(event) => handleStatusChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-primary-accent focus:ring-2 focus:ring-primary/20 sm:w-52"
            >
              <option value="">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="APPROVED">Aprovado</option>
              <option value="REJECTED">Rejeitado</option>
              <option value="DRAFT">Rascunho</option>
              <option value="CANCELLED">Cancelado</option>
              <option value="EXPIRED">Expirado</option>
              <option value="BLOCKED">Bloqueado</option>
            </select>
          </div>

          {/* Results information */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? 'Carregando verificações...'
                : `${filtered.length} de ${items.length} verificação(ões)`}
            </p>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <VerificationSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border py-16 text-center">
            <XCircle className="h-10 w-10 text-destructive" />

            <p className="mt-3 text-sm font-medium text-foreground">
              Não foi possível carregar as verificações.
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Verifique sua conexão e tente novamente.
            </p>

            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <ClipboardCheck className="h-7 w-7 text-muted-foreground/50" />
            </div>

            <p className="mt-4 text-sm font-semibold text-foreground">
              Nenhuma verificação encontrada
            </p>

            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {hasFilters
                ? 'Não encontramos resultados para os filtros selecionados.'
                : 'Ainda não existem solicitações de verificação.'}
            </p>

            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={clearFilters}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((item) => (
              <VerificationCard
                key={item.verificationId}
                item={item}
              />
            ))}
          </div>
        )}
      </PageContent>
    </div>
  )
}
